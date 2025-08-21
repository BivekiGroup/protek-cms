'use client'

import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_ORDERS } from '@/lib/graphql/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Search, Eye, Package, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'

interface Client {
  id: string
  name: string
}

interface OrderHistoryProps {
  client: Client
}

interface OrderItem {
  id: string
  productId?: string
  product?: {
    id: string
    name: string
    article?: string
  }
  externalId?: string
  name: string
  article?: string
  brand?: string
  price: number
  quantity: number
  totalPrice: number
}

interface Payment {
  id: string
  yookassaPaymentId: string
  status: string
  amount: number
  confirmationUrl?: string
}

interface Order {
  id: string
  orderNumber: string
  clientId?: string
  client?: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  clientEmail?: string
  clientPhone?: string
  clientName?: string
  status: string
  totalAmount: number
  discountAmount: number
  finalAmount: number
  currency: string
  items: OrderItem[]
  payments: Payment[]
  deliveryAddress?: string
  comment?: string
  createdAt: string
  updatedAt: string
}

interface OrdersResponse {
  orders: Order[]
  total: number
  hasMore: boolean
}

const getOrderStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    PENDING: 'Ожидает оплаты',
    PAID: 'Оплачен',
    PROCESSING: 'В обработке',
    SHIPPED: 'Отправлен',
    DELIVERED: 'Доставлен',
    CANCELED: 'Отменен',
    REFUNDED: 'Возвращен'
  }
  return statusMap[status] || status
}

const getOrderStatusColor = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const colorMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    PENDING: 'outline',
    PAID: 'default',
    PROCESSING: 'secondary',
    SHIPPED: 'secondary',
    DELIVERED: 'default',
    CANCELED: 'destructive',
    REFUNDED: 'destructive'
  }
  return colorMap[status] || 'outline'
}

const formatPrice = (price: number, currency: string = 'RUB'): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price)
}

export const OrderHistory = ({ client }: OrderHistoryProps) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { data, loading, error, refetch } = useQuery<{ orders: OrdersResponse }>(GET_ORDERS, {
    variables: {
      clientId: client.id,
      status: statusFilter || undefined,
      search: search || undefined,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage
    },
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network'
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
    // Обновляем данные с небольшой задержкой для debounce
    setTimeout(() => {
      refetch({
        clientId: client.id,
        status: statusFilter || undefined,
        search: value || undefined,
        limit: itemsPerPage,
        offset: 0
      })
    }, 300)
  }

  const handleStatusFilter = (value: string) => {
    const newStatus = value === 'all' ? '' : value
    setStatusFilter(newStatus)
    setCurrentPage(1)
    // Сразу обновляем данные при изменении статуса
    refetch({
      clientId: client.id,
      status: newStatus || undefined,
      search: search || undefined,
      limit: itemsPerPage,
      offset: 0
    })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    refetch({
      clientId: client.id,
      status: statusFilter || undefined,
      search: search || undefined,
      limit: itemsPerPage,
      offset: (page - 1) * itemsPerPage
    })
  }

  if (error) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>История заказов</CardTitle>
      </CardHeader>
      <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ошибка загрузки истории заказов: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const orders = data?.orders?.orders || []
  const total = data?.orders?.total || 0
  const totalPages = Math.ceil(total / itemsPerPage)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          История заказов
          {total > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {total}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Фильтры */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по номеру заказа..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={statusFilter || 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="PENDING">Ожидает оплаты</SelectItem>
                <SelectItem value="PAID">Оплачен</SelectItem>
                <SelectItem value="PROCESSING">В обработке</SelectItem>
                <SelectItem value="SHIPPED">Отправлен</SelectItem>
                <SelectItem value="DELIVERED">Доставлен</SelectItem>
                <SelectItem value="CANCELED">Отменен</SelectItem>
                <SelectItem value="REFUNDED">Возвращен</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Таблица заказов */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Заказы не найдены</h3>
            <p className="text-muted-foreground">
              {search || statusFilter 
                ? 'Попробуйте изменить параметры поиска'
                : 'У этого клиента пока нет заказов'
              }
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер заказа</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Товары</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getOrderStatusColor(order.status)}>
                        {getOrderStatusText(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {order.items.slice(0, 2).map((item, index) => (
                          <div key={item.id} className="text-sm">
                            <span className="font-medium">{item.name}</span>
                            {item.article && (
                              <span className="text-muted-foreground ml-1">
                                ({item.article})
                              </span>
                            )}
                            <span className="text-muted-foreground ml-1">
                              × {item.quantity}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <div className="text-sm text-muted-foreground">
                            +{order.items.length - 2} товаров
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {order.discountAmount > 0 && (
                          <div className="text-sm text-muted-foreground line-through">
                            {formatPrice(order.totalAmount, order.currency)}
                          </div>
                        )}
                        <div className="font-medium">
                          {formatPrice(order.finalAmount, order.currency)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/orders?search=${order.orderNumber}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Показано {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, total)} из {total}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Назад
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Далее
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 