"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Users, ExternalLink, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery } from '@apollo/client'
import { GET_DASHBOARD_CLIENTS, GET_DASHBOARD_ORDERS } from '@/lib/graphql/queries'
import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import React from 'react'

const statusLabels: Record<string, string> = {
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  PROCESSING: 'Обрабатывается',
  ASSEMBLING: 'На сборке',
  IN_DELIVERY: 'В доставке',
  AWAITING_PICKUP: 'Ждет выдачи',
  DELIVERED: 'Доставлен',
  RETURN_REQUESTED: 'Возврат запрошен',
  CANCELED: 'Отказ',
  REFUNDED: 'Возврат оформлен',
}

function statusBadgeColor(status?: string) {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800'
    case 'PAID':
      return 'bg-green-100 text-green-800'
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800'
    case 'ASSEMBLING':
      return 'bg-indigo-100 text-indigo-800'
    case 'IN_DELIVERY':
      return 'bg-purple-100 text-purple-800'
    case 'AWAITING_PICKUP':
      return 'bg-teal-100 text-teal-800'
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-800'
    case 'RETURN_REQUESTED':
      return 'bg-orange-100 text-orange-800'
    case 'CANCELED':
    case 'REFUNDED':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function formatCurrency(amount?: number, currency?: string) {
  if (typeof amount !== 'number') return '—'
  const cur = currency || 'RUB'
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: cur }).format(amount)
  } catch {
    return `${Math.round(amount)} ${cur}`
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  const { data: ordersData, loading: ordersLoading } = useQuery(GET_DASHBOARD_ORDERS, {
    variables: { status: 'PENDING', limit: 5, offset: 0 },
    fetchPolicy: 'no-cache',
  })
  // Важно: стабилизируем дату, чтобы не триггерить бесконечные перезапросы
  const registeredFromISO = useMemo(() => (
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  ), [])

  const { data: clientsData, loading: clientsLoading } = useQuery(GET_DASHBOARD_CLIENTS, {
    variables: {
      filter: { registeredFrom: registeredFromISO },
      limit: 5,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    fetchPolicy: 'no-cache',
  })

  // Запрос для неподтвержденных клиентов
  const { data: unconfirmedData } = useQuery(GET_DASHBOARD_CLIENTS, {
    variables: {
      filter: { unconfirmed: true },
      limit: 0,
      offset: 0,
    },
    fetchPolicy: 'no-cache',
  })

  const newOrders = ordersData?.orders?.orders || []
  const ordersTotal = ordersData?.orders?.total || 0
  // Фильтруем клиентов: только подтвержденные и не анонимные
  const recentClients = (clientsData?.clients || []).filter((client: any) =>
    client.isConfirmed &&
    client.phone !== 'anonymous' &&
    !client.id?.startsWith('anon_')
  )
  const recentClientsTotal = clientsData?.clientsCount || 0
  const unconfirmedCount = unconfirmedData?.clientsCount || 0

  const handleClientClick = (client: any) => {
    router.push(`/dashboard/clients/${client.id}`)
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

  const getShortOrderNumber = (orderNumber: string) => {
    const parts = orderNumber.split('-')
    if (parts.length === 3) {
      const lastPart = parts[2].slice(-3)
      return `${parts[0]}-${lastPart}`
    }
    return orderNumber
  }

  const getLegalEntityName = (order: any) => {
    if (order.legalEntity) {
      return order.legalEntity.shortName
    }
    return '—'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  return (
    <div className="p-4 space-y-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Главная панель</h1>
        <p className="text-sm text-gray-600">Обзор новых заказов и новых клиентов</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Link href="/dashboard/orders">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Новые заказы</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{ordersLoading ? '…' : ordersTotal}</div>
              <p className="text-xs text-muted-foreground">Требуют обработки</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/clients">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Новые клиенты (7 дней)</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{clientsLoading ? '…' : recentClientsTotal}</div>
              <p className="text-xs text-muted-foreground">Зарегистрировались за неделю</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/clients?tab=unverified">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ожидают проверки</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{clientsLoading ? '…' : unconfirmedCount}</div>
              <p className="text-xs text-muted-foreground">Неподтвержденных клиентов</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              Новые заказы
            </CardTitle>
            <CardDescription className="text-xs">Заказы, требующие обработки</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/orders">
              Все заказы
              <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {ordersLoading ? (
            <div className="text-center py-6 text-sm text-gray-500">Загрузка…</div>
          ) : newOrders.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">Нет новых заказов</div>
          ) : (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {newOrders.map((order: any) => {
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
                          <Badge className={`${statusBadgeColor(order.status)} text-xs py-0 px-2`}>
                            {statusLabels[order.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-xs font-medium">
                          {formatCurrency(order.finalAmount, order.currency)}
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          {order.items?.length || 0} шт.
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          {formatDate(order.createdAt)}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-gray-50">
                          <TableCell colSpan={7} className="py-3 px-6">
                            <div className="space-y-4">
                              {/* Таблица товаров */}
                              <div>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b bg-gray-100">
                                      <th className="text-left py-2 px-2 font-semibold">Артикул</th>
                                      <th className="text-left py-2 px-2 font-semibold">Бренд</th>
                                      <th className="text-left py-2 px-2 font-semibold">Название</th>
                                      <th className="text-right py-2 px-2 font-semibold">Цена</th>
                                      <th className="text-center py-2 px-2 font-semibold">Кол-во</th>
                                      <th className="text-right py-2 px-2 font-semibold">Итого</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.items.map((item: any) => (
                                      <tr key={item.id} className="border-b bg-white">
                                        <td className="py-2 px-2">{item.article || '—'}</td>
                                        <td className="py-2 px-2">{item.brand || '—'}</td>
                                        <td className="py-2 px-2">{item.name}</td>
                                        <td className="text-right py-2 px-2">{formatCurrency(item.price, order.currency)}</td>
                                        <td className="text-center py-2 px-2">{item.quantity}</td>
                                        <td className="text-right py-2 px-2 font-medium">{formatCurrency(item.totalPrice, order.currency)}</td>
                                      </tr>
                                    ))}
                                    <tr className="bg-white">
                                      <td colSpan={5} className="text-right py-2 px-2 font-semibold">Сумма товаров:</td>
                                      <td className="text-right py-2 px-2">{formatCurrency(order.totalAmount, order.currency)}</td>
                                    </tr>
                                    {order.discountAmount > 0 && (
                                      <tr className="bg-white text-red-600">
                                        <td colSpan={5} className="text-right py-2 px-2 font-semibold">Скидка:</td>
                                        <td className="text-right py-2 px-2">-{formatCurrency(order.discountAmount, order.currency)}</td>
                                      </tr>
                                    )}
                                    <tr className="bg-white border-t-2">
                                      <td colSpan={5} className="text-right py-2 px-2 font-bold text-sm">Итого:</td>
                                      <td className="text-right py-2 px-2 font-bold text-sm">{formatCurrency(order.finalAmount, order.currency)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {/* Информационные блоки */}
                              <div className="grid grid-cols-4 gap-4 text-xs pt-3 border-t">
                                <div>
                                  <div className="font-semibold mb-1 text-gray-700">Контакты</div>
                                  <div>{order.client?.email || order.clientEmail || '—'}</div>
                                  <div>{order.client?.phone || order.clientPhone || '—'}</div>
                                </div>
                                <div>
                                  <div className="font-semibold mb-1 text-gray-700">Адрес доставки</div>
                                  <div>{order.deliveryAddress || 'Не указан'}</div>
                                </div>
                                <div>
                                  <div className="font-semibold mb-1 text-gray-700">Тип доставки</div>
                                  <div>{order.deliveryTime === 'pickup' ? 'Самовывоз' : order.deliveryTime === 'courier' ? 'Курьер' : order.deliveryTime || '—'}</div>
                                </div>
                                <div>
                                  <div className="font-semibold mb-1 text-gray-700">Способ оплаты</div>
                                  <div>{order.paymentMethod === 'invoice' ? 'По счёту' : order.paymentMethod === 'online' ? 'Онлайн' : order.paymentMethod || '—'}</div>
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
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/analytics">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Аналитика</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700">Поисковые запросы и просмотры товаров</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Новые клиенты (7 дней)
            </CardTitle>
            <CardDescription className="text-xs">Последние регистрации</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/clients?tab=unverified">
                Ожидают проверки ({unconfirmedCount})
                <AlertCircle className="ml-2 h-3 w-3" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/clients">
                Все клиенты
                <ExternalLink className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {clientsLoading ? (
            <div className="text-center py-6 text-sm text-gray-500">Загрузка…</div>
          ) : recentClients.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">Нет новых клиентов за период</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Имя</TableHead>
                  <TableHead>Контакт</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Юрлицо</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата регистрации</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentClients.map((client: any) => (
                  <TableRow
                    key={client.id}
                    className="hover:bg-gray-50 text-sm cursor-pointer"
                    onClick={() => handleClientClick(client)}
                  >
                    <TableCell className="font-medium py-2 text-xs">
                      {client.name}
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      {client.phone || '—'}
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      {client.email || '—'}
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      {client.legalEntities && client.legalEntities.length > 0 ? client.legalEntities[0].shortName : '—'}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant={client.isConfirmed ? 'secondary' : 'destructive'} className="text-xs py-0 px-2">
                        {client.isConfirmed ? 'Подтверждён' : 'Не подтверждён'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      {formatDate(client.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
