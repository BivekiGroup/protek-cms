"use client"
import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, gql } from '@apollo/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const GET_TICKET = gql`
  query GetTicket($id: ID!) {
    supportTicket(id: $id) {
      id
      subject
      status
      priority
      createdAt
      updatedAt
      client { id name phone }
      assignedTo { id firstName lastName }
      messages {
        id
        authorType
        content
        createdAt
        authorUser { id firstName lastName }
        authorClient { id name phone }
        attachments { id url fileName contentType size createdAt }
      }
    }
  }
`

const ADD_MESSAGE = gql`
  mutation AddSupportTicketMessage($input: AddSupportTicketMessageInput!) {
    addSupportTicketMessage(input: $input) {
      id
      ticketId
      content
    }
  }
`

const UPDATE_STATUS = gql`
  mutation UpdateSupportTicketStatus($id: ID!, $status: String!) {
    updateSupportTicketStatus(id: $id, status: $status) { id status }
  }
`

const ASSIGN_TICKET = gql`
  mutation AssignSupportTicket($id: ID!, $userId: ID) { assignSupportTicket(id: $id, userId: $userId) { id assignedTo { id firstName lastName } } }
`

export default function TicketPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const { data, loading, error, refetch } = useQuery(GET_TICKET, { variables: { id } })
  const [addMessage] = useMutation(ADD_MESSAGE)
  const [updateStatus] = useMutation(UPDATE_STATUS)
  const [assign] = useMutation(ASSIGN_TICKET)
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const ticket = data?.supportTicket

  const handleUpload = async (): Promise<{ url: string; fileName?: string; contentType?: string; size?: number }[]> => {
    const results: { url: string; fileName?: string; contentType?: string; size?: number }[] = []
    for (const f of files) {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('prefix', 'support')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!json?.data?.url) throw new Error('Ошибка загрузки файла')
      results.push({ url: json.data.url, fileName: f.name, contentType: f.type, size: f.size })
    }
    return results
  }

  const submitMessage = async () => {
    const attachments = await handleUpload()
    await addMessage({ variables: { input: { ticketId: id, message: text, attachments } } })
    setText('')
    setFiles([])
    await refetch()
  }

  if (loading) return <div className="p-6 text-muted-foreground">Загрузка...</div>
  if (error) return <div className="p-6 text-red-600">Ошибка: {String(error.message)}</div>
  if (!ticket) return <div className="p-6">Тикет не найден</div>

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <Link href="/dashboard/support" className="text-sm text-blue-600">← Все тикеты</Link>
            <CardTitle className="mt-1">{ticket.subject}</CardTitle>
            <div className="text-sm text-muted-foreground">{ticket.client?.name} • {ticket.client?.phone}</div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={ticket.status} onValueChange={async v => { await updateStatus({ variables: { id, status: v } }); refetch() }}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Открыт</SelectItem>
                <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                <SelectItem value="RESOLVED">Решён</SelectItem>
                <SelectItem value="CLOSED">Закрыт</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={async () => { await assign({ variables: { id, userId: null } }); refetch() }}>Снять назначение</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.messages.map((m: any) => {
            const isAdmin = m.authorType === 'ADMIN'
            const name = isAdmin ? (m.authorUser ? `${m.authorUser.firstName} ${m.authorUser.lastName}` : 'Админ') : (m.authorClient?.name || 'Клиент')
            return (
              <div key={m.id} className="flex gap-3">
                <Avatar className="h-8 w-8"><AvatarFallback>{name.substring(0,1)}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">{name} • {new Date(m.createdAt).toLocaleString()}</div>
                  <div className="mt-1 whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  {!!m.attachments?.length && (
                    <div className="flex gap-3 mt-2 flex-wrap">
                      {m.attachments.map((a: any) => (
                        a.contentType?.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.fileName || ''} className="h-24 w-24 object-cover rounded border" /></a>
                        ) : (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 bg-slate-100 rounded border">{a.fileName || 'файл'}</a>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <Textarea value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="Ответ" />
          <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} />
          <div className="flex justify-end">
            <Button disabled={!text.trim() && files.length === 0} onClick={submitMessage}>Отправить</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
