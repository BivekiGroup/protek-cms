import { ApolloClient, InMemoryCache, createHttpLink, from, ApolloLink } from '@apollo/client'
import { Observable } from '@apollo/client/core'
import { onError } from '@apollo/client/link/error'
import { setContext } from '@apollo/client/link/context'
import { incNetwork, decNetwork } from '@/lib/network-activity'

const httpLink = createHttpLink({
  uri: '/api/graphql',
})

const activityLink = new ApolloLink((operation, forward) => {
  return new Observable((observer) => {
    incNetwork()
    const sub = forward(operation).subscribe({
      next: (v) => observer.next(v),
      error: (err) => { decNetwork(); observer.error(err) },
      complete: () => { decNetwork(); observer.complete() },
    })
    return () => { try { sub.unsubscribe() } finally { decNetwork() } }
  })
})

// Добавление JWT токена к запросам
const authLink = setContext((_, { headers }) => {
  // Получаем токен из cookies (как в AuthProvider)
  let token: string | null = null
  if (typeof window !== 'undefined') {
    // Используем js-cookie для более надежного извлечения
    try {
      // Простой способ получить cookie
      const cookies = document.cookie.split(';')
      console.log('Apollo Client: все cookies:', cookies)
      const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))
      console.log('Apollo Client: найден auth-token cookie:', authCookie)
      if (authCookie) {
        token = decodeURIComponent(authCookie.split('=')[1] || '')
        console.log('Apollo Client: извлеченный токен:', token ? `${token.substring(0, 20)}...` : 'null')
        
        // Проверяем, что токен выглядит как JWT (имеет 3 части, разделенные точками)
        if (token && token.split('.').length === 3) {
          console.log('Apollo Client: токен выглядит как валидный JWT')
        } else {
          console.log('Apollo Client: токен не выглядит как JWT:', token)
          token = null
        }
      } else {
        console.log('Apollo Client: auth-token cookie не найден')
      }
    } catch (error) {
      console.error('Apollo Client: ошибка при извлечении токена:', error)
      token = null
    }
  }
  
  const finalHeaders = {
    ...headers,
    authorization: token ? `Bearer ${token}` : "",
  }
  console.log('Apollo Client: отправляем заголовок authorization:', token ? 'Bearer [JWT токен]' : 'пустой')
  
  return {
    headers: finalHeaders
  }
})

// Обработка ошибок
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    )
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`)
  }
})

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, activityLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network',
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
  },
}) 
