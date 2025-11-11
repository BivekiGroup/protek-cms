"use client"

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Loader2, Search, Eye, Trash2, Package, Truck, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { GET_ORDERS } from '@/lib/graphql/queries'
import { UPDATE_ORDER_STATUS, DELETE_ORDER } from '@/lib/graphql/mutations'

type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'ASSEMBLING'
  | 'IN_DELIVERY'
  | 'AWAITING_PICKUP'
  | 'DELIVERED'
  | 'RETURN_REQUESTED'
  | 'CANCELED'
  | 'REFUNDED'

interface Order {
  id: string
  orderNumber: string
  clientId?: string
  client?: {
    id: string
    name: string
    email?: string
    phone?: string
    legalEntities?: Array<{
      id: string
      shortName: string
      fullName: string
    }>
  }
  clientEmail?: string
  clientPhone?: string
  clientName?: string
  status: OrderStatus
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
  cancelReason?: string
  canceledAt?: string
  returnReason?: string
  returnRequestedAt?: string
  returnedAt?: string
  createdAt: string
  updatedAt: string
}

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  PROCESSING: 'Обрабатывается',
  ASSEMBLING: 'На сборке',
  IN_DELIVERY: 'В доставке',
  AWAITING_PICKUP: 'Ждет выдачи',
  DELIVERED: 'Доставлен',
  RETURN_REQUESTED: 'Возврат запрошен',
  CANCELED: 'Отказ',
  REFUNDED: 'Возврат оформлен'
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  ASSEMBLING: 'bg-indigo-100 text-indigo-800',
  IN_DELIVERY: 'bg-purple-100 text-purple-800',
  AWAITING_PICKUP: 'bg-teal-100 text-teal-800',
  DELIVERED: 'bg-green-100 text-green-800',
  RETURN_REQUESTED: 'bg-orange-100 text-orange-800',
  CANCELED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800'
}

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

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

  const getLegalEntityName = (order: Order) => {
    if (order.client?.legalEntities && order.client.legalEntities.length > 0) {
      return order.client.legalEntities[0].shortName
    }
    return order.client?.name || order.clientName || 'Гость'
  }

  const getShortOrderNumber = (orderNumber: string) => {
    // Превращаем ORD-20250101-00001 в ORD-001
    const parts = orderNumber.split('-')
    if (parts.length === 3) {
      const lastPart = parts[2].slice(-3) // последние 3 цифры
      return `${parts[0]}-${lastPart}`
    }
    return orderNumber
  }

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
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
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('ALL')}
        >
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
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('PROCESSING')}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">В обработке</p>
                <p className="text-2xl font-bold">
                  {orders.filter(o => ['PAID', 'PROCESSING', 'ASSEMBLING', 'IN_DELIVERY', 'AWAITING_PICKUP'].includes(o.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('DELIVERED')}
        >
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
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('CANCELED')}
        >
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
              <TableRow className="text-xs">
                <TableHead className="w-8"></TableHead>
                <TableHead>Номер</TableHead>
                <TableHead>Юрлицо</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Товаров</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrders.has(order.id)
                return (
                  <React.Fragment key={order.id}>
                    <TableRow
                      className="hover:bg-gray-50 text-sm cursor-pointer"
                      onClick={() => toggleOrderExpand(order.id)}
                    >
                      <TableCell className="py-2">
                        <div className="flex items-center justify-center">
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium py-2 text-xs">
                        {getShortOrderNumber(order.orderNumber)}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="text-xs">{getLegalEntityName(order)}</div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge className={`${statusColors[order.status]} text-xs py-0 px-2`}>
                          {statusLabels[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-xs font-medium">
                        {formatPrice(order.finalAmount, order.currency)}
                      </TableCell>
                      <TableCell className="py-2 text-xs">
                        {order.items.length} шт.
                      </TableCell>
                      <TableCell className="py-2 text-xs">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} className="py-2">
                        <div className="flex gap-1">
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleStatusChange(order.id, value)}
                          >
                            <SelectTrigger className="w-28 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value} className="text-xs">
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                                <Trash2 className="h-3 w-3" />
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
                    {isExpanded && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={8} className="py-3 px-6">
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <div className="font-semibold mb-1 text-gray-700">Контакты</div>
                                <div>{order.client?.email || order.clientEmail}</div>
                                <div>{order.client?.phone || order.clientPhone}</div>
                              </div>
                              <div>
                                <div className="font-semibold mb-1 text-gray-700">Доставка</div>
                                <div>{order.deliveryAddress || 'Не указан'}</div>
                                {order.comment && <div className="mt-1 text-gray-600">Комментарий: {order.comment}</div>}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold mb-2 text-xs text-gray-700">Товары</div>
                              <div className="space-y-1">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center text-xs py-1 px-2 bg-white rounded">
                                    <div className="flex-1">
                                      <span className="font-medium">{item.name}</span>
                                      {item.brand && <span className="text-gray-500 ml-2">({item.brand})</span>}
                                      {item.article && <span className="text-gray-500 ml-1">{item.article}</span>}
                                    </div>
                                    <div className="flex gap-4 items-center text-right">
                                      <span>{formatPrice(item.price, order.currency)}</span>
                                      <span className="w-12">× {item.quantity}</span>
                                      <span className="w-20 font-medium">{formatPrice(item.totalPrice, order.currency)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-end mt-2 pt-2 border-t text-xs">
                                <div className="space-y-1">
                                  <div className="flex justify-between gap-8">
                                    <span>Сумма товаров:</span>
                                    <span>{formatPrice(order.totalAmount, order.currency)}</span>
                                  </div>
                                  {order.discountAmount > 0 && (
                                    <div className="flex justify-between gap-8 text-red-600">
                                      <span>Скидка:</span>
                                      <span>-{formatPrice(order.discountAmount, order.currency)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between gap-8 font-bold text-sm border-t pt-1">
                                    <span>Итого:</span>
                                    <span>{formatPrice(order.finalAmount, order.currency)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
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
          <AlertDialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <AlertDialogHeader className="flex-shrink-0">
              <AlertDialogTitle>
                Заказ {selectedOrder.orderNumber}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Детальная информация о заказе
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {/* Информация о клиенте */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Клиент</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Имя:</strong> {selectedOrder.client?.name || selectedOrder.clientName}</div>
                    <div><strong>Email:</strong> {selectedOrder.client?.email || selectedOrder.clientEmail}</div>
                    <div><strong>Телефон:</strong> {selectedOrder.client?.phone || selectedOrder.clientPhone}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Детали заказа</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Статус:</strong>
                      <Badge className={`ml-2 ${statusColors[selectedOrder.status]}`}>
                        {statusLabels[selectedOrder.status]}
                      </Badge>
                    </div>
                    <div><strong>Дата:</strong> {formatDate(selectedOrder.createdAt)}</div>
                    <div><strong>Адрес:</strong> {selectedOrder.deliveryAddress || 'Не указан'}</div>
                    {selectedOrder.comment && (
                      <div><strong>Комментарий:</strong> {selectedOrder.comment}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Товары в заказе */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">Товары ({selectedOrder.items.length})</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 text-sm">
                      <div className="font-medium">{item.name}</div>
                      <div className="flex justify-between items-center mt-1 text-xs text-gray-600">
                        <div>
                          {item.brand && <span className="mr-2">Бренд: {item.brand}</span>}
                          {item.article && <span>Артикул: {item.article}</span>}
                        </div>
                        <div className="text-right">
                          <div>{formatPrice(item.price, selectedOrder.currency)} × {item.quantity} шт.</div>
                          <div className="font-semibold text-gray-900">
                            {formatPrice(item.totalPrice, selectedOrder.currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Итоговая сумма */}
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Сумма товаров:</span>
                  <span>{formatPrice(selectedOrder.totalAmount, selectedOrder.currency)}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Скидка:</span>
                    <span>-{formatPrice(selectedOrder.discountAmount, selectedOrder.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Итого:</span>
                  <span>{formatPrice(selectedOrder.finalAmount, selectedOrder.currency)}</span>
                </div>
              </div>
            </div>

            <AlertDialogFooter className="flex-shrink-0 mt-4">
              <AlertDialogCancel>Закрыть</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
} 
