"use client"

import { useMemo, useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  LogIn
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GET_CLIENTS } from '@/lib/graphql/queries'
import { CreateClientModal } from './CreateClientModal'
import { ImportClientsModal } from './ImportClientsModal'
import { ClientsFilters, FilterValues } from './ClientsFilters'
import { exportClientsToCSV } from '@/lib/export-utils'
import { toast } from 'sonner'

// Типы данных из GraphQL
interface Client {
  id: string
  clientNumber: string
  type: 'INDIVIDUAL' | 'LEGAL_ENTITY'
  name: string
  email?: string
  phone: string
  markup?: number
  isConfirmed: boolean
  inn?: string
  profile?: {
    name: string
    baseMarkup: number
  }
  legalEntities?: Array<{
    id: string
    shortName: string
    fullName: string
    inn?: string
  }>
  createdAt: string
}

export const ClientsList = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false)
  const [filters, setFilters] = useState<FilterValues>({
    type: 'ALL',
    isConfirmed: 'ALL',
    hasEmail: 'ALL',
    hasProfile: 'ALL'
  })

  const router = useRouter()
  const { data, loading, error, refetch } = useQuery(GET_CLIENTS)

  const frontendOrigin = useMemo(() => {
    return (process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://protekauto.ru'))
  }, [])

  const handleAddClient = () => {
    setIsCreateModalOpen(true)
  }

  const handleImportClients = () => {
    setIsImportModalOpen(true)
  }

  const handleExportClients = () => {
    const clients = data?.clients || []
    if (clients.length === 0) {
      toast.error('Нет данных для экспорта')
      return
    }
    
    const filteredClients = applyFilters(clients)
    exportClientsToCSV(filteredClients, `clients_${new Date().toISOString().split('T')[0]}.csv`)
    toast.success(`Экспортировано ${filteredClients.length} контрагентов`)
  }

  const handleEditClient = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`)
  }

  const encodeClientPayload = (client: Client) => {
    const clientData = {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      clientNumber: client.clientNumber,
    }

    const json = JSON.stringify(clientData)
    if (typeof window === 'undefined' || typeof window.btoa !== 'function') {
      throw new Error('Browser encoding APIs недоступны')
    }

    const encoder = new TextEncoder()
    const bytes = encoder.encode(json)
    let binary = ''
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    return window.btoa(binary)
  }

  const handleLoginAsClient = (client: Client) => {
    try {
      const token = `client_${client.id}_${Date.now()}`
      const encodedClient = encodeClientPayload(client)
      const redirectPath = '/profile-orders'
      const impersonationUrl = `${frontendOrigin.replace(/\/$/, '')}/auth/impersonate?token=${encodeURIComponent(token)}&client=${encodeURIComponent(encodedClient)}&redirect=${encodeURIComponent(redirectPath)}`

      const opened = window.open(impersonationUrl, '_blank', 'noopener')
      if (!opened) {
        toast.error('Браузер заблокировал открытие новой вкладки')
        return
      }

      toast.success('Открывается личный кабинет контрагента в новой вкладке')
    } catch (error) {
      console.error('Ошибка входа от имени контрагента:', error)
      toast.error('Не удалось открыть сайт контрагента')
    }
  }

  const handleClientClick = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`)
  }

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters)
  }

  const applyFilters = (clients: Client[]) => {
    return clients.filter((client: Client) => {
      // Показываем только подтвержденных контрагентов
      if (!client.isConfirmed) return false

      // Поиск по тексту
      const matchesSearch = !searchTerm ||
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm) ||
        client.clientNumber.includes(searchTerm)

      // Фильтр по типу
      const matchesType = filters.type === 'ALL' || client.type === filters.type

      // Фильтр по подтверждению (теперь не используется, т.к. все уже подтверждены)
      const matchesConfirmed = filters.isConfirmed === 'ALL' || client.isConfirmed === filters.isConfirmed

      // Фильтр по наценке
      const matchesMarkup = (!filters.markupMin || (client.markup && client.markup >= filters.markupMin)) &&
                           (!filters.markupMax || (client.markup && client.markup <= filters.markupMax))

      // Фильтр по дате регистрации
      const clientDate = new Date(client.createdAt)
      const matchesDateFrom = !filters.registrationDateFrom || clientDate >= new Date(filters.registrationDateFrom)
      const matchesDateTo = !filters.registrationDateTo || clientDate <= new Date(filters.registrationDateTo)

      // Фильтр по email
      const matchesEmail = filters.hasEmail === 'ALL' || 
                          (filters.hasEmail === true && client.email) ||
                          (filters.hasEmail === false && !client.email)

      // Фильтр по профилю
      const matchesProfile = filters.hasProfile === 'ALL' || 
                            (filters.hasProfile === true && client.profile) ||
                            (filters.hasProfile === false && !client.profile)

      return matchesSearch && matchesType && matchesConfirmed && matchesMarkup && 
             matchesDateFrom && matchesDateTo && matchesEmail && matchesProfile
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getClientTypeLabel = (client: Client) => {
    // Если у контрагента есть хотя бы одно юридическое лицо, показываем "Юр. лицо"
    if (client.legalEntities && client.legalEntities.length > 0) {
      return 'Юр. лицо'
    }
    // Иначе смотрим на тип контрагента
    return client.type === 'INDIVIDUAL' ? 'Физ. лицо' : 'Юр. лицо'
  }

  const abbreviateName = (name: string) => {
    // Функция для сокращения ФИО до формата "Фамилия И. О."
    const parts = name.trim().split(/\s+/)
    if (parts.length === 0) return name

    if (parts.length === 1) {
      return parts[0] // Только фамилия или название
    } else if (parts.length === 2) {
      return `${parts[0]} ${parts[1][0]}.` // Фамилия И.
    } else {
      // Фамилия И. О.
      return `${parts[0]} ${parts[1][0]}. ${parts[2][0]}.`
    }
  }

  const getClientProfileType = (client: Client) => {
    // Определяем тип профиля: ИП или ООО на основе первого юр.лица с названием
    if (client.legalEntities && client.legalEntities.length > 0) {
      const firstLegal = client.legalEntities[0]
      const shortName = firstLegal.shortName || ''

      // Определяем тип и возвращаем с сокращенным названием
      if (shortName.includes('ИП')) {
        const nameWithoutPrefix = shortName.replace(/^ИП\s+/i, '')
        return `ИП ${abbreviateName(nameWithoutPrefix)}`
      } else if (shortName.includes('ООО')) {
        const nameWithoutPrefix = shortName.replace(/^ООО\s+/i, '')
        return `ООО ${nameWithoutPrefix}` // ООО обычно не ФИО, оставляем как есть
      } else if (shortName.includes('АО')) {
        const nameWithoutPrefix = shortName.replace(/^АО\s+/i, '')
        return `АО ${nameWithoutPrefix}`
      } else if (shortName.includes('ПАО')) {
        const nameWithoutPrefix = shortName.replace(/^ПАО\s+/i, '')
        return `ПАО ${nameWithoutPrefix}`
      } else if (shortName.includes('ЗАО')) {
        const nameWithoutPrefix = shortName.replace(/^ЗАО\s+/i, '')
        return `ЗАО ${nameWithoutPrefix}`
      } else {
        // Если не можем определить тип, просто возвращаем короткое название
        return shortName
      }
    }
    return '—'
  }

  const getClientINN = (client: Client) => {
    // Берем ИНН из первого юр.лица или из основного контрагента
    if (client.legalEntities && client.legalEntities.length > 0 && client.legalEntities[0].inn) {
      return client.legalEntities[0].inn
    }
    return client.inn || '—'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Контрагенты</h1>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка контрагентов...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Контрагенты</h1>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-red-600">
              <p>Ошибка загрузки контрагентов: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const clients = data?.clients || []
  const filteredClients = applyFilters(clients)

  return (
    <div className="space-y-4">
      {/* Заголовок и действия */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Поиск контрагентов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsFiltersModalOpen(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Фильтры
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImportClients}>
            <Upload className="h-4 w-4 mr-2" />
            Импорт
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportClients}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button size="sm" onClick={handleAddClient}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить контрагента
          </Button>
        </div>
      </div>

      {/* Таблица контрагентов */}
      <Card>
        <CardHeader>
          <CardTitle>Список контрагентов ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>ID контрагента</TableHead>
                <TableHead>Юрлицо</TableHead>
                <TableHead>ИНН</TableHead>
                <TableHead>Наценка</TableHead>
                <TableHead>Контактное лицо</TableHead>
                <TableHead>Номер телефона</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Дата регистрации</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client: Client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-gray-50 text-sm"
                  onClick={() => handleClientClick(client.id)}
                >
                  <TableCell className="font-medium py-2 text-xs">
                    {client.clientNumber}
                  </TableCell>
                  <TableCell className="py-2 text-xs">
                    <Badge variant="secondary" className="text-xs py-0 px-2">
                      {getClientProfileType(client)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-xs">{getClientINN(client)}</TableCell>
                  <TableCell className="py-2 text-xs">{client.markup ? `${client.markup}%` : '—'}</TableCell>
                  <TableCell className="py-2 text-xs">{client.name}</TableCell>
                  <TableCell className="py-2 text-xs">{client.phone}</TableCell>
                  <TableCell className="py-2 text-xs">{client.email || '—'}</TableCell>
                  <TableCell className="py-2 text-xs">{formatDate(client.createdAt)}</TableCell>
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoginAsClient(client)}
                      title="Войти от имени пользователя"
                      className="h-7 w-7 p-0"
                    >
                      <LogIn className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredClients.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Контрагенты не найдены' : 'Нет контрагентов'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальные окна */}
      <CreateClientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      
      <ImportClientsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
      
      <ClientsFilters
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={filters}
      />
    </div>
  )
} 
