"use client"
import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, gql } from '@apollo/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const SUPPORT_TICKETS = gql`
  query SupportTickets($filter: SupportTicketsFilter, $limit: Int, $offset: Int) {
    supportTickets(filter: $filter, limit: $limit, offset: $offset) {
      id
      subject
      status
      priority
      lastMessageAt
      createdAt
      client { id name phone }
      assignedTo { id firstName lastName }
    }
  }
`

const statusRu: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Решён',
  CLOSED: 'Закрыт',
}

const priorityRu: Record<string, string> = {
  LOW: 'Низкий',
  NORMAL: 'Обычный',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
}

export default function SupportTicketsPage() {
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const { data, loading, error, refetch } = useQuery(SUPPORT_TICKETS, { variables: { filter: { status, search: search || undefined }, limit: 50, offset: 0 } })

  const tickets = data?.supportTickets || []

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Техподдержка — тикеты</CardTitle>
          <div className="flex items-center gap-2 w-full max-w-xl">
            <Input placeholder="Поиск по теме" value={search} onChange={e => setSearch(e.target.value)} />
            <Select value={status ?? 'all'} onValueChange={v => setStatus(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Все статусы" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="OPEN">Открыт</SelectItem>
                <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                <SelectItem value="RESOLVED">Решён</SelectItem>
                <SelectItem value="CLOSED">Закрыт</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => refetch()}>Применить</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-gray-500">Загрузка...</div>}
          {error && <div className="text-red-600">Ошибка: {String(error.message)}</div>}
          {!loading && (
            tickets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тема</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Приоритет</TableHead>
                    <TableHead>Назначен</TableHead>
                    <TableHead>Обновлён</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t: any) => (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => (window.location.href = `/dashboard/support/${t.id}`)}>
                      <TableCell className="font-medium">{t.subject}</TableCell>
                      <TableCell>{t.client?.name || 'Клиент'}<div className="text-xs text-muted-foreground">{t.client?.phone}</div></TableCell>
                      <TableCell>
                        <Badge variant={t.status === 'OPEN' ? 'secondary' : t.status === 'IN_PROGRESS' ? 'default' : t.status === 'RESOLVED' ? 'outline' : 'destructive'}>
                          {statusRu[t.status] || t.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.priority === 'URGENT' ? 'destructive' : t.priority === 'HIGH' ? 'default' : 'secondary'}>
                          {priorityRu[t.priority] || t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : '—'}
                      </TableCell>
                      <TableCell>{new Date(t.lastMessageAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center text-muted-foreground py-8">Тикетов пока нет</div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
