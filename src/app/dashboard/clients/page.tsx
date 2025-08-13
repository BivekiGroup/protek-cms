"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientsList } from '@/components/clients/ClientsList'
import { ProfilesList } from '@/components/clients/ProfilesList'
import { DiscountsList } from '@/components/clients/DiscountsList'
import { StatusesList } from '@/components/clients/StatusesList'

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState('clients')

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Клиенты</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clients">Клиенты</TabsTrigger>
          <TabsTrigger value="profiles">Профили</TabsTrigger>
          <TabsTrigger value="discounts">Скидки</TabsTrigger>
          <TabsTrigger value="statuses">Статус</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <ClientsList />
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