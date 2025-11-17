'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { GET_USERS, CREATE_USER, UPDATE_USER, DELETE_USER, ADMIN_CHANGE_PASSWORD, GET_ME } from '@/lib/graphql/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileUpload } from '@/components/ui/file-upload'
import { Trash2, Edit, Plus, Key, Users, Shield, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  companyName?: string
  avatar?: string
  role: 'ADMIN' | 'MODERATOR' | 'USER'
  createdAt: string
  updatedAt: string
}

interface CreateUserInput {
  firstName: string
  lastName: string
  email: string
  password: string
  companyName?: string
  avatar?: string
  role?: 'ADMIN' | 'MODERATOR' | 'USER'
}

interface UpdateUserInput {
  firstName?: string
  lastName?: string
  email?: string
  companyName?: string
  avatar?: string
  role?: 'ADMIN' | 'MODERATOR' | 'USER'
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'destructive'
    case 'MODERATOR':
      return 'default'
    case 'USER':
      return 'secondary'
    default:
      return 'secondary'
  }
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'Администратор'
    case 'MODERATOR':
      return 'Модератор'
    case 'USER':
      return 'Пользователь'
    default:
      return role
  }
}

const CreateUserDialog = ({ onUserCreated }: { onUserCreated: () => void }) => {
  const [open, setOpen] = useState(false)
  const [useFileUpload, setUseFileUpload] = useState(true)
  const [formData, setFormData] = useState<CreateUserInput>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
    avatar: '',
    role: 'USER'
  })

  const [createUser, { loading }] = useMutation(CREATE_USER, {
    onCompleted: () => {
      toast.success('Пользователь успешно создан')
      setOpen(false)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        companyName: '',
        avatar: '',
        role: 'USER'
      })
      setUseFileUpload(true)
      onUserCreated()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createUser({
      variables: {
        input: {
          ...formData,
          avatar: formData.avatar || null
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Добавить пользователя
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать нового пользователя</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Название компании</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Необязательно"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Роль</Label>
            <Select value={formData.role} onValueChange={(value: 'ADMIN' | 'MODERATOR' | 'USER') => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">Пользователь</SelectItem>
                <SelectItem value="MODERATOR">Модератор</SelectItem>
                <SelectItem value="ADMIN">Администратор</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Avatar Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Аватар</Label>
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
                onUpload={(url) => setFormData({ ...formData, avatar: url })}
                accept="image/*"
                maxSize={5 * 1024 * 1024} // 5MB для аватаров
                disabled={loading}
              />
            ) : (
              <div className="space-y-2">
                <Input
                  id="avatar"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-xs text-gray-500">
                  Введите URL изображения для аватара
                </p>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Создание...' : 'Создать пользователя'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const EditUserDialog = ({ user, onUserUpdated }: { user: User; onUserUpdated: () => void }) => {
  const [open, setOpen] = useState(false)
  const [useFileUpload, setUseFileUpload] = useState(true)
  const [formData, setFormData] = useState<UpdateUserInput>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    companyName: user.companyName || '',
    avatar: user.avatar || '',
    role: user.role
  })

  const [updateUser, { loading }] = useMutation(UPDATE_USER, {
    onCompleted: () => {
      toast.success('Пользователь успешно обновлен')
      setOpen(false)
      onUserUpdated()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateUser({
      variables: {
        id: user.id,
        input: {
          ...formData,
          avatar: formData.avatar || null
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать пользователя</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Название компании</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Необязательно"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Роль</Label>
            <Select value={formData.role} onValueChange={(value: 'ADMIN' | 'MODERATOR' | 'USER') => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">Пользователь</SelectItem>
                <SelectItem value="MODERATOR">Модератор</SelectItem>
                <SelectItem value="ADMIN">Администратор</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Avatar Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Аватар</Label>
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
                onUpload={(url) => setFormData({ ...formData, avatar: url })}
                accept="image/*"
                maxSize={5 * 1024 * 1024} // 5MB для аватаров
                disabled={loading}
              />
            ) : (
              <div className="space-y-2">
                <Input
                  id="avatar"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-xs text-gray-500">
                  Введите URL изображения для аватара
                </p>
              </div>
            )}

            {/* Current Avatar Preview */}
            {formData.avatar && (
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={formData.avatar} />
                  <AvatarFallback>
                    {formData.firstName?.[0]}{formData.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-500">Текущий аватар</span>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const ChangePasswordDialog = ({ user, onPasswordChanged }: { user: User; onPasswordChanged: () => void }) => {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  const [adminChangePassword, { loading }] = useMutation(ADMIN_CHANGE_PASSWORD, {
    onCompleted: () => {
      toast.success('Пароль успешно изменен')
      setOpen(false)
      setNewPassword('')
      onPasswordChanged()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    adminChangePassword({
      variables: {
        input: {
          userId: user.id,
          newPassword
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Key className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Изменить пароль пользователя</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Новый пароль</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500">
              Минимум 6 символов
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Изменение...' : 'Изменить пароль'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ManagersPage() {
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'MODERATOR' | 'USER'>('ALL')

  // Проверяем права доступа
  const { data: meData, loading: meLoading, error: meError } = useQuery(GET_ME)
  const { data, loading, error, refetch } = useQuery(GET_USERS, {
    skip: !meData?.me || meData.me.role !== 'ADMIN' // Загружаем данные только если пользователь админ
  })

  const [deleteUser] = useMutation(DELETE_USER, {
    onCompleted: () => {
      toast.success('Пользователь успешно удален')
      refetch()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Вы уверены, что хотите удалить пользователя ${userName}?`)) {
      deleteUser({ variables: { id: userId } })
    }
  }

  // Показываем загрузку пока проверяем права
  if (meLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Проверка прав доступа...</div>
        </div>
      </div>
    )
  }

  // Показываем ошибку если не удалось получить данные пользователя
  if (meError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ошибка проверки прав доступа: {meError.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Проверяем, что пользователь является администратором
  if (!meData?.me || meData.me.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            У вас нет прав доступа к этой странице. Только администраторы могут управлять пользователями.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Загрузка...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Ошибка: {error.message}</div>
        </div>
      </div>
    )
  }

  const users: User[] = data?.users || []

  // Фильтрация пользователей по роли
  const filteredUsers = roleFilter === 'ALL'
    ? users
    : users.filter(user => user.role === roleFilter)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Менеджеры</h1>
          <p className="text-muted-foreground">
            Управление пользователями системы
          </p>
        </div>
        <CreateUserDialog onUserCreated={() => refetch()} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            roleFilter === 'ALL' ? 'border-primary border-2' : ''
          }`}
          onClick={() => setRoleFilter('ALL')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего пользователей
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            {roleFilter === 'ALL' && (
              <p className="text-xs text-primary mt-1 font-medium">Активный фильтр</p>
            )}
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            roleFilter === 'ADMIN' ? 'border-primary border-2' : ''
          }`}
          onClick={() => setRoleFilter(roleFilter === 'ADMIN' ? 'ALL' : 'ADMIN')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Администраторы
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(user => user.role === 'ADMIN').length}
            </div>
            {roleFilter === 'ADMIN' && (
              <p className="text-xs text-primary mt-1 font-medium">Активный фильтр</p>
            )}
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            roleFilter === 'MODERATOR' ? 'border-primary border-2' : ''
          }`}
          onClick={() => setRoleFilter(roleFilter === 'MODERATOR' ? 'ALL' : 'MODERATOR')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Модераторы
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(user => user.role === 'MODERATOR').length}
            </div>
            {roleFilter === 'MODERATOR' && (
              <p className="text-xs text-primary mt-1 font-medium">Активный фильтр</p>
            )}
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            roleFilter === 'USER' ? 'border-primary border-2' : ''
          }`}
          onClick={() => setRoleFilter(roleFilter === 'USER' ? 'ALL' : 'USER')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Пользователи
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(user => user.role === 'USER').length}
            </div>
            {roleFilter === 'USER' && (
              <p className="text-xs text-primary mt-1 font-medium">Активный фильтр</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список пользователей ({filteredUsers.length})</CardTitle>
          <CardDescription>
            {roleFilter === 'ALL'
              ? 'Управляйте пользователями системы'
              : `Показаны пользователи с ролью: ${getRoleLabel(roleFilter)}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="text-xs">Пользователь</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Роль</TableHead>
                <TableHead className="text-xs">Дата создания</TableHead>
                <TableHead className="text-xs text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="py-2 text-xs">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-xs">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium text-xs">
                        {user.firstName} {user.lastName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-xs">{user.email}</TableCell>
                  <TableCell className="py-2 text-xs">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs py-0 px-2">
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-xs">
                    {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <EditUserDialog user={user} onUserUpdated={() => refetch()} />
                      <ChangePasswordDialog user={user} onPasswordChanged={() => refetch()} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 