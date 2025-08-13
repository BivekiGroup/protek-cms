"use client"

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  getNewOrders, 
  getNewVinRequests, 
  getProblematicClients,
  getOrderStatusColor,
  getOrderStatusText,
  getVinRequestStatusColor,
  getVinRequestStatusText,
  getClientStatusText,
  formatAmount,
  truncateRequest,
  type Order,
  type VinRequest,
  type Client
} from '@/lib/mock-data'
import { 
  ShoppingCart, 
  Car, 
  Users, 
  ExternalLink,
  Clock,
  AlertCircle
} from 'lucide-react'

export default function DashboardPage() {
  const newOrders = getNewOrders()
  const newVinRequests = getNewVinRequests()
  const problematicClients = getProblematicClients()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Главная панель
        </h1>
        <p className="text-gray-600">
          Обзор новых заказов, VIN-запросов и клиентов требующих внимания
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Новые заказы</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {newOrders.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Требуют обработки
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIN-запросы</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {newVinRequests.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Новые запросы
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Проблемные клиенты</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {problematicClients.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Требуют внимания
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Новые заказы
            </CardTitle>
            <CardDescription>
              Заказы, требующие обработки
            </CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings">
              Все заказы
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {newOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Нет новых заказов
            </div>
          ) : (
            <div className="space-y-4">
              {newOrders.map((order: Order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div>
                      <Link 
                        href={`/dashboard/settings`}
                        className="font-semibold text-blue-600 hover:text-blue-800"
                      >
                        #{order.number}
                      </Link>
                      <div className="text-sm text-gray-500">
                        {order.date}
                      </div>
                    </div>
                    <div>
                      <Link 
                        href={`/dashboard/settings`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {order.client}
                      </Link>
                    </div>
                    <div className="font-semibold">
                      {formatAmount(order.amount)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="secondary"
                      className={getOrderStatusColor(order)}
                    >
                      {getOrderStatusText(order)}
                    </Badge>
                    {getOrderStatusColor(order).includes('red') && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIN Requests Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              VIN-запросы
            </CardTitle>
            <CardDescription>
              Новые запросы на подбор запчастей
            </CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings">
              Все запросы
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {newVinRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Нет новых VIN-запросов
            </div>
          ) : (
            <div className="space-y-4">
              {newVinRequests.map((request: VinRequest) => (
                <div key={request.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-4">
                      <Link 
                        href={`/dashboard/settings`}
                        className="font-semibold text-blue-600 hover:text-blue-800"
                      >
                        #{request.number}
                      </Link>
                      <div className="text-sm text-gray-500">
                        {request.date}
                      </div>
                      <Link 
                        href={`/dashboard/settings`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {request.client}
                      </Link>
                    </div>
                    <div className="text-sm text-gray-700">
                      {truncateRequest(request.request, 80)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Badge 
                      variant="secondary"
                      className={getVinRequestStatusColor(request)}
                    >
                      {getVinRequestStatusText(request)}
                    </Badge>
                    {getVinRequestStatusColor(request).includes('red') && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Problematic Clients Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Клиенты требующие внимания
            </CardTitle>
            <CardDescription>
              Клиенты с проблемами авторизации или сменой типа
            </CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings">
              Все клиенты
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {problematicClients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Нет проблемных клиентов
            </div>
          ) : (
            <div className="space-y-4">
              {problematicClients.map((client: Client) => (
                <div key={client.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="font-semibold">
                        #{client.number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {client.phone}
                      </div>
                    </div>
                    <div>
                      <Link 
                        href={`/dashboard/settings`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {client.name}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={client.status === 'auth_failed' ? 'destructive' : 'secondary'}
                    >
                      {getClientStatusText(client)}
                    </Badge>
                    <Clock className="h-4 w-4 text-gray-400" />
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