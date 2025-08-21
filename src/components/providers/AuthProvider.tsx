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
    const savedToken = Cookies.get('auth-token')
    const savedUser = Cookies.get('auth-user')

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setToken(savedToken)
        setUser(parsedUser)
      } catch (error) {
        console.error('Ошибка парсинга данных пользователя:', error)
        Cookies.remove('auth-token')
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

      // Сохраняем в cookies
      Cookies.set('auth-token', newToken, { expires: 7 }) // 7 дней
      Cookies.set('auth-user', JSON.stringify(newUser), { expires: 7 })

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
      Cookies.remove('auth-token')
      Cookies.remove('auth-user')
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