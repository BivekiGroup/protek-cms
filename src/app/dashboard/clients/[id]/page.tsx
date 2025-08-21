'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@apollo/client'
import { GET_CLIENT_FULL } from '@/lib/graphql/queries'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Компоненты вкладок
import { GeneralSettings } from '@/components/clients/card/GeneralSettings'
import { DeliveryAddresses } from '@/components/clients/card/DeliveryAddresses'
import { Garage } from '@/components/clients/card/Garage'
import { Contacts } from '@/components/clients/card/Contacts'
import { Contracts } from '@/components/clients/card/Contracts'
import { LegalEntities } from '@/components/clients/card/LegalEntities'
import { BankDetails } from '@/components/clients/card/BankDetails'
import { OrderHistory } from '@/components/clients/card/OrderHistory'

export default function ClientCardPage() {
  const params = useParams()
  const clientId = params.id as string

  const { data, loading, error, refetch } = useQuery(GET_CLIENT_FULL, {
    variables: { id: clientId },
    errorPolicy: 'all'
  })

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ошибка загрузки данных клиента: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!data?.client) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Клиент не найден
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const client = data.client

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
            Назад к списку клиентов
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {client.name}
          </h1>
          <p className="text-muted-foreground">
            Клиент #{client.clientNumber} • {client.type === 'INDIVIDUAL' ? 'Физическое лицо' : 'Юридическое лицо'}
          </p>
        </div>
      </div>

      {/* Вкладки */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="general">Общие настройки</TabsTrigger>
          <TabsTrigger value="addresses">Адреса доставки</TabsTrigger>
          <TabsTrigger value="garage">Гараж</TabsTrigger>
          <TabsTrigger value="contacts">Контакты</TabsTrigger>
          <TabsTrigger value="contracts">Договоры</TabsTrigger>
          <TabsTrigger value="legal">Юрлицо</TabsTrigger>
          <TabsTrigger value="bank">Реквизиты</TabsTrigger>
          <TabsTrigger value="orders">История заказов</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings client={client} onUpdate={refetch} />
        </TabsContent>

        <TabsContent value="addresses">
          <DeliveryAddresses client={client} onUpdate={refetch} />
        </TabsContent>

        <TabsContent value="garage">
          <Garage client={client} onUpdate={refetch} />
        </TabsContent>

        <TabsContent value="contacts">
          <Contacts client={client} onUpdate={refetch} />
        </TabsContent>

        <TabsContent value="contracts">
          <Contracts client={client} onUpdate={refetch} />
        </TabsContent>

        <TabsContent value="legal">
          <LegalEntities client={client} onUpdate={refetch} />
        </TabsContent>

        <TabsContent value="bank">
          <BankDetails client={client} onUpdate={refetch} />
        </TabsContent>

        <TabsContent value="orders">
          <OrderHistory client={client} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 