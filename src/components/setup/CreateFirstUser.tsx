"use client"

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@apollo/client'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CREATE_USER } from '@/lib/graphql/queries'

const createUserSchema = z.object({
  firstName: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  lastName: z.string().min(2, 'Фамилия должна содержать минимум 2 символа'),
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  confirmPassword: z.string(),
  avatar: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
})

type CreateUserFormData = z.infer<typeof createUserSchema>

interface CreateFirstUserProps {
  onSuccess: () => void
}

export const CreateFirstUser = ({ onSuccess }: CreateFirstUserProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [createUser] = useMutation(CREATE_USER, {
    onCompleted: () => {
      setIsLoading(false)
      onSuccess()
    },
    onError: (error) => {
      setIsLoading(false)
      console.error('Ошибка создания пользователя:', error)
    }
  })

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      avatar: '',
    },
  })

  const handleSubmit = async (data: CreateUserFormData) => {
    setIsLoading(true)
    
    try {
      await createUser({
        variables: {
          input: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: data.password,
            avatar: data.avatar || undefined,
          }
        }
      })
    } catch (error) {
      console.error('Ошибка при создании пользователя:', error)
      setIsLoading(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('prefix', 'avatars')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        form.setValue('avatar', result.data.url)
      } else {
        console.error('Ошибка загрузки:', result.error)
      }
    } catch (error) {
      console.error('Ошибка загрузки файла:', error)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const watchedFirstName = form.watch('firstName')
  const watchedLastName = form.watch('lastName')
  const watchedAvatar = form.watch('avatar')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Настройка системы</CardTitle>
          <CardDescription>
            Создайте первого администратора для начала работы с системой
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Аватар */}
              <div className="flex flex-col items-center mb-6">
                <div 
                  className="relative cursor-pointer group"
                  onClick={handleAvatarClick}
                >
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={watchedAvatar} alt="Аватар" />
                    <AvatarFallback className="text-lg">
                      {getInitials(watchedFirstName || 'U', watchedLastName || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs">
                      {isUploadingAvatar ? 'Загрузка...' : 'Изменить'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Нажмите для загрузки аватара
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* URL аватара (альтернативный способ) */}
              <FormField
                control={form.control}
                name="avatar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL аватара (альтернативно)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/avatar.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Имя */}
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите имя" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Фамилия */}
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Фамилия</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите фамилию" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Пароль */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Введите пароль"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Подтверждение пароля */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Подтвердите пароль</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Повторите пароль"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Создание...' : 'Создать администратора'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
} 