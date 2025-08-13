"use client"

import { useState } from 'react'
import { useQuery } from '@apollo/client'
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
  Edit,
  LogIn,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  profile?: {
    name: string
    baseMarkup: number
  }
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
  const { data, loading, error } = useQuery(GET_CLIENTS)

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
    toast.success(`Экспортировано ${filteredClients.length} клиентов`)
  }

  const handleEditClient = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`)
  }

  const handleLoginAsClient = (clientId: string) => {
    // TODO: Реализовать вход от имени клиента
    toast.info('Функция входа от имени клиента будет реализована позже')
    console.log('Войти от имени клиента:', clientId)
  }

  const handleClientClick = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`)
  }

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters)
  }

  const applyFilters = (clients: Client[]) => {
    return clients.filter((client: Client) => {
      // Поиск по тексту
      const matchesSearch = !searchTerm || 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm) ||
        client.clientNumber.includes(searchTerm)

      // Фильтр по типу
      const matchesType = filters.type === 'ALL' || client.type === filters.type

      // Фильтр по подтверждению
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

  const getClientTypeLabel = (type: 'INDIVIDUAL' | 'LEGAL_ENTITY') => {
    return type === 'INDIVIDUAL' ? 'Физ. лицо' : 'Юр. лицо'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Клиенты</h1>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка клиентов...</p>
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
          <h1 className="text-2xl font-bold">Клиенты</h1>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-red-600">
              <p>Ошибка загрузки клиентов: {error.message}</p>
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
              placeholder="Поиск клиентов..."
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
            Добавить клиента
          </Button>
        </div>
      </div>

      {/* Таблица клиентов */}
      <Card>
        <CardHeader>
          <CardTitle>Список клиентов ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер клиента</TableHead>
                <TableHead>Тип профиля</TableHead>
                <TableHead>Имя</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Наценка</TableHead>
                <TableHead>Номер телефона</TableHead>
                <TableHead>Дата регистрации</TableHead>
                <TableHead>Статус регистрации</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client: Client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {client.clientNumber}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getClientTypeLabel(client.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleClientClick(client.id)}
                      className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                    >
                      {client.name}
                    </button>
                  </TableCell>
                  <TableCell>{client.email || '—'}</TableCell>
                  <TableCell>{client.markup ? `${client.markup}%` : '—'}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{formatDate(client.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={client.isConfirmed ? "default" : "destructive"}>
                      {client.isConfirmed ? 'Подтвержден' : 'Не подтвержден'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoginAsClient(client.id)}
                        title="Войти от имени пользователя"
                      >
                        <LogIn className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClient(client.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredClients.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Клиенты не найдены' : 'Нет клиентов'}
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