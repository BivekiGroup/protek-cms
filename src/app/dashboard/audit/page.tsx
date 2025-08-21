'use client'

import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_AUDIT_LOGS, GET_AUDIT_LOGS_COUNT, GET_ME } from '@/lib/graphql/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  AlertCircle, 
  Activity, 
  Users, 
  LogIn, 
  LogOut, 
  UserPlus, 
  UserMinus, 
  Edit, 
  Key, 
  Camera,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar
} from 'lucide-react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  avatar?: string
  role: 'ADMIN' | 'MODERATOR' | 'USER'
}

interface AuditLog {
  id: string
  userId: string
  user: User
  action: string
  details?: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'USER_LOGIN':
      return <LogIn className="h-4 w-4" />
    case 'USER_LOGOUT':
      return <LogOut className="h-4 w-4" />
    case 'USER_CREATE':
      return <UserPlus className="h-4 w-4" />
    case 'USER_UPDATE':
      return <Edit className="h-4 w-4" />
    case 'USER_DELETE':
      return <UserMinus className="h-4 w-4" />
    case 'PASSWORD_CHANGE':
      return <Key className="h-4 w-4" />
    case 'AVATAR_UPLOAD':
      return <Camera className="h-4 w-4" />
    case 'PROFILE_UPDATE':
      return <Edit className="h-4 w-4" />
    default:
      return <Activity className="h-4 w-4" />
  }
}

const getActionLabel = (action: string) => {
  switch (action) {
    case 'USER_LOGIN':
      return 'Вход в систему'
    case 'USER_LOGOUT':
      return 'Выход из системы'
    case 'USER_CREATE':
      return 'Создание пользователя'
    case 'USER_UPDATE':
      return 'Обновление пользователя'
    case 'USER_DELETE':
      return 'Удаление пользователя'
    case 'PASSWORD_CHANGE':
      return 'Смена пароля'
    case 'AVATAR_UPLOAD':
      return 'Загрузка аватара'
    case 'PROFILE_UPDATE':
      return 'Обновление профиля'
    default:
      return action
  }
}

const getActionBadgeVariant = (action: string) => {
  switch (action) {
    case 'USER_LOGIN':
      return 'default'
    case 'USER_LOGOUT':
      return 'secondary'
    case 'USER_CREATE':
      return 'default'
    case 'USER_UPDATE':
      return 'default'
    case 'USER_DELETE':
      return 'destructive'
    case 'PASSWORD_CHANGE':
      return 'default'
    case 'AVATAR_UPLOAD':
      return 'secondary'
    case 'PROFILE_UPDATE':
      return 'secondary'
    default:
      return 'secondary'
  }
}

const ITEMS_PER_PAGE = 25

export default function AuditPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  // Проверяем права доступа
  const { data: meData, loading: meLoading, error: meError } = useQuery(GET_ME)
  
  const { data: countData } = useQuery(GET_AUDIT_LOGS_COUNT, {
    skip: !meData?.me || meData.me.role !== 'ADMIN'
  })
  
  const { data, loading, error, refetch } = useQuery(GET_AUDIT_LOGS, {
    variables: {
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE
    },
    skip: !meData?.me || meData.me.role !== 'ADMIN',
    pollInterval: 30000 // Обновляем каждые 30 секунд
  })

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
            У вас нет прав доступа к этой странице. Только администраторы могут просматривать логи аудита.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Загрузка логов аудита...</div>
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
            Ошибка загрузки логов аудита: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const auditLogs: AuditLog[] = data?.auditLogs || []
  const totalCount = countData?.auditLogsCount || 0
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Фильтрация по поисковому запросу
  const filteredLogs = auditLogs.filter(log => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      log.user.firstName.toLowerCase().includes(searchLower) ||
      log.user.lastName.toLowerCase().includes(searchLower) ||
      log.user.email.toLowerCase().includes(searchLower) ||
      getActionLabel(log.action).toLowerCase().includes(searchLower) ||
      log.details?.toLowerCase().includes(searchLower) ||
      log.ipAddress?.includes(searchTerm)
    )
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Аудит</h1>
          <p className="text-muted-foreground">
            Журнал всех действий пользователей в системе
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <Activity className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего записей
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Входы в систему
            </CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs.filter(log => log.action === 'USER_LOGIN').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Действия с пользователями
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs.filter(log => 
                ['USER_CREATE', 'USER_UPDATE', 'USER_DELETE'].includes(log.action)
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Смены паролей
            </CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs.filter(log => log.action === 'PASSWORD_CHANGE').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Поиск */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск в логах</CardTitle>
          <CardDescription>
            Поиск по имени, email, действию или IP-адресу
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Введите поисковый запрос..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Таблица логов */}
      <Card>
        <CardHeader>
          <CardTitle>Журнал аудита</CardTitle>
          <CardDescription>
            Показано {filteredLogs.length} из {auditLogs.length} записей на странице {currentPage} из {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Детали</TableHead>
                <TableHead>IP-адрес</TableHead>
                <TableHead>Дата и время</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={log.user.avatar} />
                      <AvatarFallback>
                        {log.user.firstName[0]}{log.user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {log.user.firstName} {log.user.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getActionIcon(log.action)}
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {getActionLabel(log.action)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={log.details}>
                      {log.details || '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-1 py-0.5 rounded">
                      {log.ipAddress || '—'}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(log.createdAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Страница {currentPage} из {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Вперед
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 