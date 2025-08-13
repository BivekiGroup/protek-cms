'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'

const ME_QUERY = gql`
  query Me {
    me {
      id
      firstName
      lastName
      email
      role
    }
  }
`

export default function TestAuthPage() {
  const { user, token, isAuthenticated } = useAuth()
  const { data, loading, error } = useQuery(ME_QUERY)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Тест авторизации</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">AuthProvider состояние:</h2>
          <p>Авторизован: {isAuthenticated ? 'Да' : 'Нет'}</p>
          <p>Токен: {token ? `${token.substring(0, 20)}...` : 'Нет'}</p>
          <p>Пользователь: {user ? JSON.stringify(user, null, 2) : 'Нет'}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">GraphQL запрос me:</h2>
          <p>Загрузка: {loading ? 'Да' : 'Нет'}</p>
          <p>Ошибка: {error ? error.message : 'Нет'}</p>
          <p>Данные: {data ? JSON.stringify(data, null, 2) : 'Нет'}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Cookies:</h2>
          <pre>{typeof window !== 'undefined' ? document.cookie : 'SSR'}</pre>
        </div>
      </div>
    </div>
  )
} 