"use client"

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Search, Eye, Edit, Trash2, Package, Truck, CheckCircle, XCircle } from 'lucide-react'
import { GET_ORDERS } from '@/lib/graphql/queries'
import { UPDATE_ORDER_STATUS, DELETE_ORDER } from '@/lib/graphql/mutations'

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
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED' | 'REFUNDED'
  totalAmount: number
  discountAmount: number
  finalAmount: number
  currency: string
  items: Array<{
    id: string
    name: string
    article?: string
    brand?: string
    price: number
    quantity: number
    totalPrice: number
  }>
  payments: Array<{
    id: string
    status: string
    amount: number
  }>
  deliveryAddress?: string
  comment?: string
  createdAt: string
  updatedAt: string
}

const statusLabels = {
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELED: 'Отменен',
  REFUNDED: 'Возвращен'
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800'
}

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)

  const { data, loading, error, refetch } = useQuery(GET_ORDERS, {
    variables: {
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: search || undefined,
      limit: 50,
      offset: 0
    },
    fetchPolicy: 'cache-and-network'
  })

  // Обновляем запрос при изменении фильтров
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refetch({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
        limit: 50,
        offset: 0
      })
    }, 300) // Debounce 300ms

    return () => clearTimeout(timeoutId)
  }, [search, statusFilter, refetch])

  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS, {
    onCompleted: () => {
      refetch()
    }
  })

  const [deleteOrder] = useMutation(DELETE_ORDER, {
    onCompleted: () => {
      refetch()
    }
  })

  const orders: Order[] = data?.orders?.orders || []

  // Поиск теперь происходит на сервере, поэтому просто используем полученные заказы
  const filteredOrders = orders

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus({
        variables: {
          id: orderId,
          status: newStatus
        }
      })
    } catch (error) {
      console.error('Ошибка обновления статуса заказа:', error)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrder({
        variables: { id: orderId }
      })
    } catch (error) {
      console.error('Ошибка удаления заказа:', error)
    }
  }

  const formatPrice = (price: number, currency = 'RUB') => {
    return `${price.toLocaleString('ru-RU')} ${currency === 'RUB' ? '₽' : currency}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Ошибка загрузки заказов: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Заказы</h1>
          <p className="text-gray-600">
            Управление заказами клиентов
            {data?.orders?.total && (
              <span className="ml-2 text-sm">
                (Всего: {data.orders.total})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Поиск</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по номеру заказа, клиенту, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Статус</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все статусы</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего заказов</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">В обработке</p>
                <p className="text-2xl font-bold">
                  {orders.filter(o => ['PAID', 'PROCESSING', 'SHIPPED'].includes(o.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Выполнено</p>
                <p className="text-2xl font-bold">
                  {orders.filter(o => o.status === 'DELIVERED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Отменено</p>
                <p className="text-2xl font-bold">
                  {orders.filter(o => ['CANCELED', 'REFUNDED'].includes(o.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица заказов */}
      <Card>
        <CardHeader>
          <CardTitle>Список заказов ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер заказа</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Товаров</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {order.client?.name || order.clientName || 'Гость'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.client?.email || order.clientEmail}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.client?.phone || order.clientPhone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {formatPrice(order.finalAmount, order.currency)}
                      </div>
                      {order.discountAmount > 0 && (
                        <div className="text-sm text-gray-500">
                          Скидка: {formatPrice(order.discountAmount, order.currency)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.items.length} шт.
                  </TableCell>
                  <TableCell>
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order)
                          setShowOrderDetails(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить заказ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Это действие нельзя отменить. Заказ {order.orderNumber} будет удален навсегда.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteOrder(order.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {search ? 'Заказы не найдены' : 'Заказов пока нет'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно с деталями заказа */}
      {showOrderDetails && selectedOrder && (
        <AlertDialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <AlertDialogContent className="max-w-4xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Заказ {selectedOrder.orderNumber}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Детальная информация о заказе
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4">
              {/* Информация о клиенте */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Информация о клиенте</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Имя:</strong> {selectedOrder.client?.name || selectedOrder.clientName}</div>
                    <div><strong>Email:</strong> {selectedOrder.client?.email || selectedOrder.clientEmail}</div>
                    <div><strong>Телефон:</strong> {selectedOrder.client?.phone || selectedOrder.clientPhone}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Информация о заказе</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Статус:</strong> 
                      <Badge className={`ml-2 ${statusColors[selectedOrder.status]}`}>
                        {statusLabels[selectedOrder.status]}
                      </Badge>
                    </div>
                    <div><strong>Дата создания:</strong> {formatDate(selectedOrder.createdAt)}</div>
                    <div><strong>Адрес доставки:</strong> {selectedOrder.deliveryAddress || 'Не указан'}</div>
                    {selectedOrder.comment && (
                      <div><strong>Комментарий:</strong> {selectedOrder.comment}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Товары в заказе */}
              <div>
                <h4 className="font-semibold mb-2">Товары в заказе</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Наименование</TableHead>
                      <TableHead>Артикул</TableHead>
                      <TableHead>Бренд</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Количество</TableHead>
                      <TableHead>Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.article || '-'}</TableCell>
                        <TableCell>{item.brand || '-'}</TableCell>
                        <TableCell>{formatPrice(item.price, selectedOrder.currency)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatPrice(item.totalPrice, selectedOrder.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Итоговая сумма */}
              <div className="border-t pt-4">
                <div className="flex justify-end space-y-1">
                  <div className="text-right space-y-1">
                    <div>Сумма товаров: {formatPrice(selectedOrder.totalAmount, selectedOrder.currency)}</div>
                    {selectedOrder.discountAmount > 0 && (
                      <div>Скидка: -{formatPrice(selectedOrder.discountAmount, selectedOrder.currency)}</div>
                    )}
                    <div className="font-bold text-lg">
                      Итого: {formatPrice(selectedOrder.finalAmount, selectedOrder.currency)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Закрыть</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
} 