import { ApolloServer } from '@apollo/server'
import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { typeDefs } from '@/lib/graphql/typeDefs'
import { resolvers } from '@/lib/graphql/resolvers'
import { extractTokenFromHeaders, getUserFromToken } from '@/lib/auth'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

interface Context {
  userId?: string
  clientId?: string
  userRole?: string
  userEmail?: string
  headers?: Headers
  categoryLevelCache?: Map<string, number>
  categoryParentMap?: Map<string, string | null>
  categoryHierarchyLoaded?: boolean
  clientDeleted?: boolean // Флаг для удалённых клиентов
}

// Функция для создания контекста
const createBaseContext = (overrides: Partial<Context> = {}): Context => ({
  categoryLevelCache: new Map(),
  categoryParentMap: new Map(),
  categoryHierarchyLoaded: false,
  ...overrides,
})

async function createContext(req: any): Promise<Context> {
  const requestHeaders = req.headers
  const token = extractTokenFromHeaders(requestHeaders)
  console.log('GraphQL: получен токен:', token ? 'есть' : 'нет')
  
  if (!token) {
    return createBaseContext({ headers: requestHeaders })
  }

  try {
    // Это JWT токен пользователя (админ/модератор)
    const payload = getUserFromToken(token)
    console.log('GraphQL: JWT payload:', payload ? 'найден' : 'не найден')
    if (payload) {
      console.log('GraphQL: пользователь авторизован:', payload.userId, 'роль:', payload.role)
      return createBaseContext({
        userId: payload.userId,
        userRole: payload.role,
        userEmail: payload.email,
        headers: requestHeaders
      })
    }
  } catch (error) {
    console.error('GraphQL: ошибка при парсинге токена:', error)
  }

  // Если это не админский токен, проверяем, не клиентский ли это токен
  if (token.startsWith('client_')) {
    console.log('GraphQL: найден клиентский токен:', token)

    const tokenParts = token.split('_')
    let clientId: string

    if (tokenParts.length >= 2) {
      // Это токен формата client_${clientId} или client_${clientId}_${timestamp}
      // Для анонимных сессий формат: client_anon_<random>_<timestamp>
      // Нужно собрать все части после 'client_' обратно
      clientId = tokenParts.slice(1).join('_')
      console.log('GraphQL: извлечен clientId из токена:', clientId)

      // Пропускаем проверку для анонимных клиентов (начинаются с anon_)
      const isAnonymous = clientId.startsWith('anon_')

      if (!isAnonymous) {
        // SECURITY: Проверяем существование клиента в базе данных только для авторизованных
        try {
          const clientExists = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true }
          })

          if (!clientExists) {
            console.log('GraphQL: клиент не найден в БД (возможно удален), помечаем как удалённого')
            return createBaseContext({
              headers: requestHeaders,
              clientDeleted: true // Помечаем, что клиент был удалён
            })
          }
        } catch (error) {
          console.error('GraphQL: ошибка при проверке существования клиента:', error)
          return createBaseContext({ headers: requestHeaders })
        }
      } else {
        console.log('GraphQL: анонимная сессия, пропускаем проверку в БД:', clientId)
      }
    } else {
      // Неправильный формат токена
      console.error('GraphQL: неправильный формат клиентского токена:', token)
      return createBaseContext({ headers: requestHeaders })
    }

    const context = createBaseContext({
      clientId: clientId,
      headers: requestHeaders
    })
    console.log('GraphQL: возвращаем клиентский контекст:', context)
    return context
  }

  // Попробуем декодировать как JWT клиентский токен
  try {
    const decoded = jwt.decode(token) as any
    if (decoded && decoded.clientId) {
      console.log('GraphQL: клиент авторизован через JWT:', decoded.clientId)

      // Проверяем только реальных клиентов, а не анонимных (начинаются с anon_)
      const isAnonymous = decoded.clientId.startsWith('anon_')

      if (!isAnonymous) {
        // SECURITY: Проверяем существование клиента в базе данных
        try {
          const clientExists = await prisma.client.findUnique({
            where: { id: decoded.clientId },
            select: { id: true }
          })

          if (!clientExists) {
            console.log('GraphQL: JWT клиент не найден в БД (возможно удален), помечаем как удалённого')
            return createBaseContext({
              headers: requestHeaders,
              clientDeleted: true // Помечаем, что клиент был удалён
            })
          }
        } catch (error) {
          console.error('GraphQL: ошибка при проверке существования JWT клиента:', error)
          return createBaseContext({ headers: requestHeaders })
        }
      } else {
        console.log('GraphQL: JWT анонимная сессия, пропускаем проверку в БД:', decoded.clientId)
      }

      return createBaseContext({
        clientId: decoded.clientId,
        headers: requestHeaders
      })
    }
  } catch (error) {
    console.error('GraphQL: ошибка при парсинге клиентского токена:', error)
  }

  return createBaseContext({ headers: requestHeaders })
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [
    {
      async requestDidStart() {
        return {
          async didResolveOperation(requestContext: any) {
            console.log('🔍 GraphQL Operation:', {
              operationName: requestContext.request.operationName,
              query: requestContext.request.query?.replace(/\s+/g, ' ').substring(0, 200) + '...',
              variables: requestContext.request.variables
            });
          },
          async didEncounterErrors(requestContext: any) {
            console.error('❌ GraphQL Errors:', requestContext.errors);
          }
        };
      }
    }
  ]
})

const handler = startServerAndCreateNextHandler(server, {
  context: async (req) => {
    const context = await createContext(req)
    // Устанавливаем контекст глобально для резолверов
    ;(global as any).__graphqlContext = context
    return context
  }
})

// Простая CORS-поддержка (особенно полезна в dev при разных порталах)
function getCorsHeaders() {
  const isDev = process.env.NODE_ENV === 'development'
  // В dev явно укажем фронтенд-оригин, чтобы работать с заголовками/креденшелами корректно
  const allowedOrigin = isDev
    ? (process.env.FRONTEND_ORIGIN || 'http://localhost:3001')
    : (process.env.FRONTEND_ORIGIN || 'https://protekauto.ru')
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: getCorsHeaders() })
}

async function withCors(request: Request) {
  const res = await handler(request)
  const resHeaders = new Headers(res.headers)
  const cors = getCorsHeaders()
  Object.entries(cors).forEach(([k, v]) => resHeaders.set(k, v))
  // Безопасно клонируем тело в текст, чтобы не ломать поток
  const text = await res.text()
  return new Response(text, { status: res.status, statusText: res.statusText, headers: resHeaders })
}

export async function GET(request: Request) {
  return withCors(request)
}

export async function POST(request: Request) {
  return withCors(request)
} 
