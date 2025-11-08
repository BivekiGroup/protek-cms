"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientsList } from '@/components/clients/ClientsList'
import { ProfilesList } from '@/components/clients/ProfilesList'
import { DiscountsList } from '@/components/clients/DiscountsList'
import { StatusesList } from '@/components/clients/StatusesList'
import { UnverifiedClientsList } from '@/components/clients/UnverifiedClientsList'

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'clients')

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Клиенты</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="clients">Клиенты</TabsTrigger>
          <TabsTrigger value="unverified">Ожидают проверки</TabsTrigger>
          <TabsTrigger value="profiles">Профили</TabsTrigger>
          <TabsTrigger value="discounts">Скидки</TabsTrigger>
          <TabsTrigger value="statuses">Статус</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <ClientsList />
        </TabsContent>

        <TabsContent value="unverified" className="space-y-4">
          <UnverifiedClientsList />
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <ProfilesList />
        </TabsContent>

        <TabsContent value="discounts" className="space-y-4">
          <DiscountsList />
        </TabsContent>

        <TabsContent value="statuses" className="space-y-4">
          <StatusesList />
        </TabsContent>
      </Tabs>
    </div>
  )
} 