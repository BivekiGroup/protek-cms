"use client"

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Users, ExternalLink, Clock, AlertCircle } from 'lucide-react'
import { useQuery } from '@apollo/client'
import { GET_DASHBOARD_CLIENTS, GET_DASHBOARD_ORDERS } from '@/lib/graphql/queries'
import { useMemo } from 'react'

function statusBadgeColor(status?: string) {
  switch (status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-800'
    case 'PAID': return 'bg-green-100 text-green-800'
    case 'PROCESSING': return 'bg-blue-100 text-blue-800'
    case 'SHIPPED': return 'bg-indigo-100 text-indigo-800'
    case 'DELIVERED': return 'bg-emerald-100 text-emerald-800'
    case 'CANCELED':
    case 'REFUNDED': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
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

  const newOrders = ordersData?.orders?.orders || []
  const ordersTotal = ordersData?.orders?.total || 0
  const recentClients = clientsData?.clients || []
  const recentClientsTotal = clientsData?.clientsCount || 0

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Главная панель</h1>
        <p className="text-gray-600">Обзор новых заказов и новых клиентов</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Новые заказы</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{ordersLoading ? '…' : ordersTotal}</div>
            <p className="text-xs text-muted-foreground">Требуют обработки</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Новые клиенты (7 дней)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{clientsLoading ? '…' : recentClientsTotal}</div>
            <p className="text-xs text-muted-foreground">Зарегистрировались за неделю</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Неподтверждённые клиенты</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{clientsLoading ? '…' : (recentClients.filter((c: any) => !c.isConfirmed).length)}</div>
            <p className="text-xs text-muted-foreground">Требуют подтверждения</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Новые заказы
            </CardTitle>
            <CardDescription>Заказы, требующие обработки</CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/orders">
              Все заказы
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="text-center py-8 text-gray-500">Загрузка…</div>
          ) : newOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Нет новых заказов</div>
          ) : (
            <div className="space-y-4">
              {newOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div>
                      <Link href={`/dashboard/orders`} className="font-semibold text-blue-600 hover:text-blue-800">#{order.orderNumber}</Link>
                      <div className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString('ru-RU')}</div>
                    </div>
                    <div>
                      <Link href={`/dashboard/clients`} className="text-blue-600 hover:text-blue-800">{order.clientName || order.clientPhone || 'Клиент'}</Link>
                    </div>
                    <div className="font-semibold">{formatCurrency(order.finalAmount, order.currency)}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className={statusBadgeColor(order.status)}>{order.status}</Badge>
                    {order.status === 'CANCELED' && (<AlertCircle className="h-4 w-4 text-red-500" />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Новые клиенты (7 дней)
            </CardTitle>
            <CardDescription>Последние регистрации</CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/clients">
              Все клиенты
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {clientsLoading ? (
            <div className="text-center py-8 text-gray-500">Загрузка…</div>
          ) : recentClients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Нет новых клиентов за период</div>
          ) : (
            <div className="space-y-4">
              {recentClients.map((client: any) => (
                <div key={client.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="font-semibold">{client.name}</div>
                      <div className="text-sm text-gray-500">{client.phone || client.email || '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={client.isConfirmed ? 'secondary' : 'destructive'}>{client.isConfirmed ? 'Подтверждён' : 'Не подтверждён'}</Badge>
                    <span title={new Date(client.createdAt).toLocaleString('ru-RU')}>
                      <Clock className="h-4 w-4 text-gray-400" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
