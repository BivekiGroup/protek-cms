"use client"

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileUpload } from "@/components/ui/file-upload"
import { 
  GET_ME, 
  UPDATE_PROFILE, 
  CHANGE_PASSWORD, 
  UPLOAD_AVATAR 
} from '@/lib/graphql/queries'
import { 
  User, 
  Lock, 
  Camera, 
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  avatar?: string
  role: string
  createdAt: string
  updatedAt: string
}

interface ProfileFormData {
  firstName: string
  lastName: string
  email: string
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function SettingsPage() {
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: ''
  })
  
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [avatarUrl, setAvatarUrl] = useState('')
  const [useFileUpload, setUseFileUpload] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const { data, loading, error } = useQuery(GET_ME, {
    onCompleted: (data) => {
      if (data.me) {
        setProfileForm({
          firstName: data.me.firstName,
          lastName: data.me.lastName,
          email: data.me.email
        })
      }
    }
  })

  const [updateProfile, { loading: updateLoading }] = useMutation(UPDATE_PROFILE, {
    onCompleted: () => {
      setMessage({ type: 'success', text: 'Профиль успешно обновлен!' })
      setTimeout(() => setMessage(null), 5000)
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message })
      setTimeout(() => setMessage(null), 5000)
    },
    refetchQueries: [{ query: GET_ME }]
  })

  const [changePassword, { loading: passwordLoading }] = useMutation(CHANGE_PASSWORD, {
    onCompleted: () => {
      setMessage({ type: 'success', text: 'Пароль успешно изменен!' })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setMessage(null), 5000)
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message })
      setTimeout(() => setMessage(null), 5000)
    }
  })

  const [uploadAvatar, { loading: avatarLoading }] = useMutation(UPLOAD_AVATAR, {
    onCompleted: () => {
      setMessage({ type: 'success', text: 'Аватар успешно обновлен!' })
      setAvatarUrl('')
      setTimeout(() => setMessage(null), 5000)
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message })
      setTimeout(() => setMessage(null), 5000)
    },
    refetchQueries: [{ query: GET_ME }]
  })

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    await updateProfile({
      variables: {
        input: profileForm
      }
    })
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Новые пароли не совпадают' })
      setTimeout(() => setMessage(null), 5000)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Новый пароль должен содержать минимум 6 символов' })
      setTimeout(() => setMessage(null), 5000)
      return
    }

    await changePassword({
      variables: {
        input: {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        }
      }
    })
  }

  const handleAvatarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!avatarUrl.trim()) {
      setMessage({ type: 'error', text: 'Введите URL аватара' })
      setTimeout(() => setMessage(null), 5000)
      return
    }

    await uploadAvatar({
      variables: {
        file: avatarUrl.trim()
      }
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ошибка загрузки данных: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const user: User = data?.me

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Настройки
        </h1>
        <p className="text-gray-600">
          Управление настройками вашего личного кабинета
        </p>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Профиль
            </CardTitle>
            <CardDescription>
              Обновите информацию вашего профиля
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Имя</Label>
                <Input
                  id="firstName"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Введите ваше имя"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input
                  id="lastName"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Введите вашу фамилию"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Введите ваш email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Роль</Label>
                <Input
                  value={user?.role || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={updateLoading}
              >
                {updateLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Сохранение...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Сохранить профиль
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Avatar Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Аватар
            </CardTitle>
            <CardDescription>
              Обновите ваш аватар
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user?.avatar} alt={user?.firstName} />
                  <AvatarFallback className="text-lg">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Способ загрузки</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant={useFileUpload ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUseFileUpload(true)}
                      >
                        Загрузить файл
                      </Button>
                      <Button
                        type="button"
                        variant={!useFileUpload ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUseFileUpload(false)}
                      >
                        По URL
                      </Button>
                    </div>
                  </div>

                  {useFileUpload ? (
                    <FileUpload
                      onUpload={(url) => {
                        uploadAvatar({
                          variables: { file: url }
                        })
                      }}
                      accept="image/*"
                      maxSize={5 * 1024 * 1024} // 5MB для аватаров
                      disabled={avatarLoading}
                    />
                  ) : (
                    <form onSubmit={handleAvatarSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="avatarUrl">URL аватара</Label>
                        <Input
                          id="avatarUrl"
                          type="url"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="https://example.com/avatar.jpg"
                        />
                        <p className="text-xs text-gray-500">
                          Введите URL изображения для вашего аватара
                        </p>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={avatarLoading || !avatarUrl.trim()}
                      >
                        {avatarLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Загрузка...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4" />
                            Обновить аватар
                          </div>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Безопасность
            </CardTitle>
            <CardDescription>
              Измените ваш пароль для обеспечения безопасности аккаунта
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Текущий пароль</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Введите текущий пароль"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">Новый пароль</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Введите новый пароль"
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Подтвердите новый пароль"
                  required
                  minLength={6}
                />
              </div>

              <Button 
                type="submit" 
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Изменение...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Изменить пароль
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 