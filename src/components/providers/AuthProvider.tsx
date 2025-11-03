"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { useMutation } from '@apollo/client'
import Cookies from 'js-cookie'
import { LOGIN, LOGOUT } from '@/lib/graphql/queries'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  avatar?: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [loginMutation] = useMutation(LOGIN)
  const [logoutMutation] = useMutation(LOGOUT)

  // Проверяем токен при загрузке
  useEffect(() => {
    const savedToken = Cookies.get('cms-token')
    const savedUser = Cookies.get('auth-user')

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setToken(savedToken)
        setUser(parsedUser)
      } catch (error) {
        console.error('Ошибка парсинга данных пользователя:', error)
        Cookies.remove('cms-token')
        Cookies.remove('auth-user')
      }
    }

    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { data } = await loginMutation({
        variables: {
          input: { email, password }
        }
      })

      const { token: newToken, user: newUser } = data.login

      console.log('🔑 AuthProvider: сохраняем токен в cookie:', newToken ? `${newToken.substring(0, 20)}...` : 'null')

      // Сохраняем в cookies с явными опциями для доступности на всех страницах
      const cookieOptions = {
        expires: 7, // 7 дней
        path: '/', // Доступно на всех страницах
        sameSite: 'lax' as const, // Защита от CSRF
        secure: false // Отключаем secure для локальной разработки
      }

      // Пробуем два способа сохранения токена (используем cms-token вместо auth-token)
      Cookies.set('cms-token', newToken, cookieOptions)

      // Дублируем установку через document.cookie на случай проблем с js-cookie
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7)
      document.cookie = `cms-token=${encodeURIComponent(newToken)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`

      Cookies.set('auth-user', JSON.stringify(newUser), cookieOptions)

      // Проверяем, что cookie действительно сохранились
      const savedToken = Cookies.get('cms-token')
      console.log('✅ AuthProvider: токен сохранён в cookie:', savedToken ? `${savedToken.substring(0, 20)}...` : 'не найден!')
      console.log('📝 AuthProvider: все cookies после сохранения:', document.cookie)

      // Дополнительная проверка через document.cookie
      const allCookies = document.cookie.split(';').map(c => c.trim())
      const tokenCookie = allCookies.find(c => c.startsWith('cms-token='))
      console.log('🔍 AuthProvider: прямая проверка cms-token через document.cookie:', tokenCookie)

      setToken(newToken)
      setUser(newUser)
    } catch (error) {
      console.error('Ошибка входа:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await logoutMutation()
    } catch (error) {
      console.error('Ошибка выхода:', error)
    } finally {
      // Удаляем данные независимо от результата запроса
      Cookies.remove('cms-token', { path: '/' })
      Cookies.remove('auth-user', { path: '/' })
      setToken(null)
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 