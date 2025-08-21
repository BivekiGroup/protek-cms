"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Временные типы данных
interface ClientStatus {
  id: string
  name: string
  color: string
  description?: string
  createdAt: string
}

// Временные данные для демонстрации
const mockStatuses: ClientStatus[] = [
  {
    id: '1',
    name: 'Новый',
    color: '#3B82F6',
    description: 'Новый клиент, требует внимания',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Активный',
    color: '#10B981',
    description: 'Активный клиент с регулярными покупками',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Неактивный',
    color: '#F59E0B',
    description: 'Клиент давно не совершал покупки',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'Заблокирован',
    color: '#EF4444',
    description: 'Заблокированный клиент',
    createdAt: '2024-01-01T00:00:00Z'
  }
]

export const StatusesList = () => {
  const [statuses] = useState<ClientStatus[]>(mockStatuses)

  const handleAddStatus = () => {
    // TODO: Открыть модальное окно добавления статуса
    console.log('Добавить статус')
  }

  const handleEditStatus = (statusId: string) => {
    // TODO: Открыть модальное окно редактирования статуса
    console.log('Редактировать статус:', statusId)
  }

  const handleDeleteStatus = (statusId: string) => {
    // TODO: Удалить статус с подтверждением
    console.log('Удалить статус:', statusId)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-4">
      {/* Заголовок и действия */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Статусы клиентов</h3>
          <p className="text-sm text-gray-500">
            Управление статусами для категоризации клиентов
          </p>
        </div>
        <Button onClick={handleAddStatus}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить статус
        </Button>
      </div>

      {/* Таблица статусов */}
      <Card>
        <CardHeader>
          <CardTitle>Список статусов ({statuses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Цвет</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses.map((status) => (
                <TableRow key={status.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      style={{ 
                        borderColor: status.color,
                        color: status.color
                      }}
                    >
                      {status.color}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {status.description || '—'}
                  </TableCell>
                  <TableCell>{formatDate(status.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditStatus(status.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteStatus(status.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {statuses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Нет статусов
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 