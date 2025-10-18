'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { GET_SMS_CODES, GET_ME } from '@/lib/graphql/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Shield,
  AlertCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  Hash,
  Calendar
} from 'lucide-react'

interface SmsCode {
  id: string
  phone: string
  code: string
  sessionId: string | null
  attempts: number
  verified: boolean
  expiresAt: string
  createdAt: string
  updatedAt: string
}

const ITEMS_PER_PAGE = 50

export default function SmsCodesPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Обновляем текущее время каждую секунду для таймеров
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Проверяем права доступа
  const { data: meData, loading: meLoading, error: meError } = useQuery(GET_ME)

  const { data, loading, error, refetch } = useQuery(GET_SMS_CODES, {
    variables: {
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
      phone: searchTerm || undefined
    },
    skip: !meData?.me || meData.me.role !== 'ADMIN',
    pollInterval: 5000 // Обновляем каждые 5 секунд
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
            У вас нет прав доступа к этой странице. Только администраторы могут просматривать SMS коды.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Загрузка SMS кодов...</div>
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
            Ошибка загрузки SMS кодов: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const smsCodes: SmsCode[] = data?.smsCodes?.codes || []
  const totalCount = data?.smsCodes?.total || 0
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const activeCount = smsCodes.filter(code => new Date(code.expiresAt) > currentTime && !code.verified).length
  const verifiedCount = smsCodes.filter(code => code.verified).length
  const expiredCount = smsCodes.filter(code => new Date(code.expiresAt) <= currentTime && !code.verified).length

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const isExpired = (expiresAt: string) => new Date(expiresAt) <= currentTime

  const getStatusBadge = (code: SmsCode) => {
    if (code.verified) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Подтвержден
        </Badge>
      )
    }
    if (isExpired(code.expiresAt)) {
      return (
        <Badge variant="secondary">
          <XCircle className="w-3 h-3 mr-1" />
          Истек
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="bg-blue-500">
        <Clock className="w-3 h-3 mr-1" />
        Активен
      </Badge>
    )
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - currentTime.getTime()
    if (diff <= 0) return 'Истек'

    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    if (minutes > 0) {
      return `${minutes}м ${seconds}с`
    }
    return `${seconds}с`
  }

  const getTimeColor = (expiresAt: string, verified: boolean) => {
    if (verified) return 'text-green-500'
    if (isExpired(expiresAt)) return 'text-muted-foreground'

    const diff = new Date(expiresAt).getTime() - currentTime.getTime()
    const seconds = Math.floor(diff / 1000)

    if (seconds <= 30) return 'text-red-500 font-bold animate-pulse' // Меньше 30 секунд - критично
    if (seconds <= 60) return 'text-orange-500 font-semibold' // Меньше минуты - предупреждение
    return 'text-blue-500' // Норма
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SMS Коды</h1>
          <p className="text-muted-foreground">
            Просмотр кодов авторизации отправленных клиентам
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего кодов
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Активных
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Подтверждено
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{verifiedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Истекло
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{expiredCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Поиск */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск кодов</CardTitle>
          <CardDescription>
            Поиск по номеру телефона
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Введите номер телефона..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1) // Сбрасываем на первую страницу при поиске
              }}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Таблица кодов */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Коды авторизации</CardTitle>
          <CardDescription>
            Показано {smsCodes.length} из {totalCount} записей • Страница {currentPage} из {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Телефон</TableHead>
                <TableHead>Код</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Попытки</TableHead>
                <TableHead>Осталось времени</TableHead>
                <TableHead>Создан</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {smsCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Нет SMS кодов
                  </TableCell>
                </TableRow>
              ) : (
                smsCodes.map((smsCode) => (
                  <TableRow key={smsCode.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {smsCode.phone}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <code className="text-lg font-bold font-mono bg-yellow-100 dark:bg-yellow-900 px-3 py-1 rounded">
                          {smsCode.code}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(smsCode)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {smsCode.attempts} / 3
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${getTimeColor(smsCode.expiresAt, smsCode.verified)}`}>
                        {smsCode.verified ? '—' : formatTimeRemaining(smsCode.expiresAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(smsCode.createdAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
