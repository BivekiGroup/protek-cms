import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = '7d'

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

// Создание JWT токена
export const createToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// Верификация JWT токена
export const verifyToken = (token: string): JWTPayload | null => {
  // Быстрый фильтр: клиентские токены и не-JWT (без двух точек) не проверяем
  if (!token || token.startsWith('client_') || token.split('.').length !== 3) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (_error) {
    // Токен выглядел как JWT, но не прошёл проверку — тихо возвращаем null без шума в логах
    return null
  }
}

// Сравнение паролей
export const comparePasswords = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword)
}

// Хеширование пароля
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12)
}

// Извлечение токена из заголовков
export const extractTokenFromHeaders = (headers: Headers): string | null => {
  const authorization = headers.get('authorization')
  if (!authorization) return null
  
  const parts = authorization.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  
  return parts[1]
}

// Fallback: try to read token from cookies (auth-token)
export const extractTokenFromCookies = (headers: Headers): string | null => {
  try {
    const cookie = headers.get('cookie') || headers.get('Cookie') || ''
    if (!cookie) return null
    const parts = cookie.split(';')
    for (const p of parts) {
      const idx = p.indexOf('=')
      if (idx === -1) continue
      const key = p.slice(0, idx).trim()
      const val = p.slice(idx + 1).trim()
      if (key === 'auth-token' && val) return decodeURIComponent(val)
    }
    return null
  } catch {
    return null
  }
}

export const extractAnyToken = (headers: Headers): string | null => {
  return extractTokenFromHeaders(headers) || extractTokenFromCookies(headers)
}

// Получение пользователя из токена
export const getUserFromToken = (token: string | null): JWTPayload | null => {
  if (!token) return null
  return verifyToken(token)
} 
