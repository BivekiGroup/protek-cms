"use client"

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { GET_ORDERS } from '@/lib/graphql/queries'
import { DELETE_ORDER, UPDATE_ORDER_STATUS } from '@/lib/graphql/mutations'
import {
  Loader2,
  Search,
  Eye,
  Trash2,
  RotateCcw,
  Clock3,
  CheckCircle,
  Wallet,
} from 'lucide-react'

interface OrderItem {
  id: string
  name: string
  article?: string
  brand?: string
  price: number
  quantity: number
  totalPrice: number
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
  status:
    | 'RETURN_REQUESTED'
    | 'REFUNDED'
    | 'PENDING'
    | 'PAID'
    | 'PROCESSING'
    | 'ASSEMBLING'
    | 'IN_DELIVERY'
    | 'AWAITING_PICKUP'
    | 'DELIVERED'
    | 'CANCELED'
  totalAmount: number
  discountAmount: number
  finalAmount: number
  currency: string
  items: OrderItem[]
  deliveryAddress?: string
  comment?: string
  returnReason?: string
  returnRequestedAt?: string
  returnedAt?: string
  createdAt: string
  updatedAt: string
}

const returnStatuses: Array<Order['status']> = ['RETURN_REQUESTED', 'REFUNDED']

const statusLabels: Record<'RETURN_REQUESTED' | 'REFUNDED', string> = {
  RETURN_REQUESTED: 'Возврат запрошен',
  REFUNDED: 'Возврат оформлен',
}

const statusColors: Record<'RETURN_REQUESTED' | 'REFUNDED', string> = {
  RETURN_REQUESTED: 'bg-orange-100 text-orange-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
}

const formatPrice = (price: number, currency = 'RUB') =>
  `${price.toLocaleString('ru-RU')} ${currency === 'RUB' ? '₽' : currency}`

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('ru-RU') : '—'

export default function ReturnsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RETURN_REQUESTED' | 'REFUNDED'>('ALL')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)

  const queryVariables = useMemo(
    () => ({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: search || undefined,
      limit: 50,
      offset: 0,
    }),
    [search, statusFilter]
  )

  const { data, loading, error, refetch } = useQuery(GET_ORDERS, {
    variables: queryVariables,
    fetchPolicy: 'cache-and-network',
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      refetch(queryVariables)
    }, 300)

    return () => clearTimeout(timer)
  }, [queryVariables, refetch])

  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS, {
    onCompleted: () => {
      refetch(queryVariables)
    },
  })

  const [deleteOrder] = useMutation(DELETE_ORDER, {
    onCompleted: () => {
      refetch(queryVariables)
    },
  })

  const orders: Order[] = (data?.orders?.orders || []) as Order[]

  const filteredOrders = useMemo(() => {
    const eligible = orders.filter((order) => returnStatuses.includes(order.status))
    if (statusFilter === 'ALL') {
      return eligible
    }
    return eligible.filter((order) => order.status === statusFilter)
  }, [orders, statusFilter])

  const pendingReturns = filteredOrders.filter((order) => order.status === 'RETURN_REQUESTED')
  const completedReturns = filteredOrders.filter((order) => order.status === 'REFUNDED')
  const totalRefundAmount = filteredOrders.reduce((sum, order) => sum + order.finalAmount, 0)

  const handleStatusChange = async (orderId: string, nextStatus: 'RETURN_REQUESTED' | 'REFUNDED') => {
    try {
      await updateOrderStatus({
        variables: {
          id: orderId,
          status: nextStatus,
        },
      })
    } catch (mutationError) {
      console.error('Ошибка обновления статуса возврата:', mutationError)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrder({
        variables: { id: orderId },
      })
    } catch (mutationError) {
      console.error('Ошибка удаления заказа:', mutationError)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center text-red-600 p-4">Ошибка загрузки возвратов: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Возвраты</h1>
          <p className="text-gray-600">
            Управление запросами на возврат
            <span className="ml-2 text-sm">(Всего: {filteredOrders.length})</span>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Искать по номеру заказа, клиенту или email</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-col md:flex-row md:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Поиск</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по номеру заказа, клиенту, email..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-60">
              <label className="text-sm font-medium">Статус возврата</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все возвраты</SelectItem>
                  <SelectItem value="RETURN_REQUESTED">Возврат запрошен</SelectItem>
                  <SelectItem value="REFUNDED">Возврат оформлен</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <RotateCcw className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего возвратов</p>
                <p className="text-2xl font-bold">{filteredOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock3 className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">В обработке</p>
                <p className="text-2xl font-bold">{pendingReturns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Завершено</p>
                <p className="text-2xl font-bold">{completedReturns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Сумма возвратов</p>
                <p className="text-2xl font-bold">{formatPrice(totalRefundAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список возвратов ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер заказа</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Запрошен</TableHead>
                <TableHead>Завершен</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.client?.name || order.clientName || 'Гость'}</div>
                      <div className="text-sm text-gray-500">{order.client?.email || order.clientEmail}</div>
                      <div className="text-sm text-gray-500">{order.client?.phone || order.clientPhone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge className={statusColors[order.status as 'RETURN_REQUESTED' | 'REFUNDED']}>
                        {statusLabels[order.status as 'RETURN_REQUESTED' | 'REFUNDED']}
                      </Badge>
                      {order.returnReason && (
                        <div className="text-xs text-gray-500 max-w-[220px]">{order.returnReason}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{formatPrice(order.finalAmount, order.currency)}</div>
                  </TableCell>
                  <TableCell>{formatDateTime(order.returnRequestedAt)}</TableCell>
                  <TableCell>{formatDateTime(order.returnedAt)}</TableCell>
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
                        onValueChange={(value) => handleStatusChange(order.id, value as 'RETURN_REQUESTED' | 'REFUNDED')}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RETURN_REQUESTED">Возврат запрошен</SelectItem>
                          <SelectItem value="REFUNDED">Возврат оформлен</SelectItem>
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
                            <AlertDialogTitle>Удалить возврат?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Это действие нельзя отменить. Заказ {order.orderNumber} будет удален.
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
              {search ? 'Возвраты не найдены' : 'Запросов на возврат пока нет'}
            </div>
          )}
        </CardContent>
      </Card>

      {showOrderDetails && selectedOrder && (
        <AlertDialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <AlertDialogContent className="max-w-4xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Возврат по заказу {selectedOrder.orderNumber}</AlertDialogTitle>
              <AlertDialogDescription>Детальная информация о возврате</AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Клиент</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Имя:</strong> {selectedOrder.client?.name || selectedOrder.clientName || '—'}</div>
                    <div><strong>Email:</strong> {selectedOrder.client?.email || selectedOrder.clientEmail || '—'}</div>
                    <div><strong>Телефон:</strong> {selectedOrder.client?.phone || selectedOrder.clientPhone || '—'}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Информация о возврате</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Статус:</strong>
                      <Badge className={`ml-2 ${statusColors[selectedOrder.status as 'RETURN_REQUESTED' | 'REFUNDED']}`}>
                        {statusLabels[selectedOrder.status as 'RETURN_REQUESTED' | 'REFUNDED']}
                      </Badge>
                    </div>
                    <div><strong>Запрошен:</strong> {formatDateTime(selectedOrder.returnRequestedAt)}</div>
                    <div><strong>Завершен:</strong> {formatDateTime(selectedOrder.returnedAt)}</div>
                    {selectedOrder.returnReason && (
                      <div><strong>Причина:</strong> {selectedOrder.returnReason}</div>
                    )}
                    {selectedOrder.comment && (
                      <div><strong>Комментарий клиента:</strong> {selectedOrder.comment}</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Товары</h4>
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

              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="text-right space-y-1">
                    <div>Сумма товаров: {formatPrice(selectedOrder.totalAmount, selectedOrder.currency)}</div>
                    {selectedOrder.discountAmount > 0 && (
                      <div>Скидка: -{formatPrice(selectedOrder.discountAmount, selectedOrder.currency)}</div>
                    )}
                    <div className="font-bold text-lg">Итого к возврату: {formatPrice(selectedOrder.finalAmount, selectedOrder.currency)}</div>
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
