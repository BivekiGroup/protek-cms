"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@apollo/client'
import { HAS_USERS } from '@/lib/graphql/queries'
import { useAuth } from './AuthProvider'

interface InitializationProviderProps {
  children: React.ReactNode
}

export const InitializationProvider = ({ children }: InitializationProviderProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const { data, loading, error } = useQuery(HAS_USERS, {
    fetchPolicy: 'network-only', // Всегда проверяем актуальные данные
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  useEffect(() => {
    console.log('InitializationProvider: проверка состояния', { 
      loading, 
      error, 
      data, 
      pathname, 
      isAuthenticated, 
      authLoading 
    })
    
    if (loading || authLoading) return

    if (error) {
      console.error('Ошибка проверки инициализации:', error)
      console.error('Детали ошибки:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
      })
      setIsChecking(false)
      return
    }

    const hasUsers = data?.hasUsers
    console.log('InitializationProvider: hasUsers =', hasUsers)

    // Если пользователей нет и мы не на странице настройки
    if (!hasUsers && pathname !== '/setup') {
      console.log('InitializationProvider: перенаправление на /setup')
      router.push('/setup')
      return
    }

    // Если пользователи есть
    if (hasUsers) {
      // Если мы на странице настройки - перенаправляем на логин
      if (pathname === '/setup') {
        console.log('InitializationProvider: перенаправление на /login')
        router.push('/login')
        return
      }

      // Если не авторизованы и не на странице логина - перенаправляем на логин
      if (!isAuthenticated && pathname !== '/login') {
        console.log('InitializationProvider: перенаправление на /login (не авторизован)')
        router.push('/login')
        return
      }

      // Если авторизованы и на странице логина - перенаправляем в дашборд
      if (isAuthenticated && pathname === '/login') {
        console.log('InitializationProvider: перенаправление на /dashboard')
        router.push('/dashboard')
        return
      }
    }

    console.log('InitializationProvider: инициализация завершена')
    setIsChecking(false)
  }, [data, loading, error, pathname, router, isAuthenticated, authLoading])

  // Показываем загрузку пока проверяем инициализацию
  if (isChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Проверка системы...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 