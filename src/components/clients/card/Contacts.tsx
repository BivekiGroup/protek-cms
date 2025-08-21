'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CREATE_CLIENT_CONTACT, UPDATE_CLIENT_CONTACT, DELETE_CLIENT_CONTACT } from '@/lib/graphql/mutations'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface Contact {
  id: string
  phone?: string
  email?: string
  comment?: string
}

interface Client {
  id: string
  contacts: Contact[]
}

interface ContactsProps {
  client: Client
  onUpdate: () => void
}

export const Contacts = ({ client, onUpdate }: ContactsProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingData, setEditingData] = useState<Contact | null>(null)
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    comment: ''
  })

  const [createContact] = useMutation(CREATE_CLIENT_CONTACT, {
    onCompleted: () => {
      toast.success('Контакт добавлен')
      setIsAdding(false)
      setFormData({ phone: '', email: '', comment: '' })
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка добавления: ${error.message}`)
    }
  })

  const [updateContact] = useMutation(UPDATE_CLIENT_CONTACT, {
    onCompleted: () => {
      toast.success('Контакт обновлен')
      setEditingId(null)
      setEditingData(null)
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка обновления: ${error.message}`)
    }
  })

  const [deleteContact] = useMutation(DELETE_CLIENT_CONTACT, {
    onCompleted: () => {
      toast.success('Контакт удален')
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка удаления: ${error.message}`)
    }
  })

  const handleSave = async () => {
    if (!formData.phone && !formData.email) {
      toast.error('Заполните хотя бы один контакт (телефон или email)')
      return
    }

    try {
      await createContact({
        variables: {
          clientId: client.id,
          input: {
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            comment: formData.comment || undefined
          }
        }
      })
    } catch (error) {
      console.error('Ошибка сохранения:', error)
    }
  }

  const handleUpdate = async () => {
    if (!editingData || (!editingData.phone && !editingData.email)) {
      toast.error('Заполните хотя бы один контакт (телефон или email)')
      return
    }

    try {
      await updateContact({
        variables: {
          id: editingData.id,
          input: {
            phone: editingData.phone || undefined,
            email: editingData.email || undefined,
            comment: editingData.comment || undefined
          }
        }
      })
    } catch (error) {
      console.error('Ошибка обновления:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот контакт?')) {
      try {
        await deleteContact({
          variables: { id }
        })
      } catch (error) {
        console.error('Ошибка удаления:', error)
      }
    }
  }

  const startEditing = (contact: Contact) => {
    setEditingId(contact.id)
    setEditingData({ ...contact })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingData(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Контакты</CardTitle>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить контакт
        </Button>
      </CardHeader>
      <CardContent>
        {client.contacts.length === 0 && !isAdding ? (
          <p className="text-muted-foreground">Дополнительные контакты не добавлены</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Телефон</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Комментарий</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    {editingId === contact.id ? (
                      <Input
                        value={editingData?.phone || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, phone: e.target.value } : null)}
                        placeholder="Телефон"
                      />
                    ) : (
                      contact.phone || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === contact.id ? (
                      <Input
                        type="email"
                        value={editingData?.email || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, email: e.target.value } : null)}
                        placeholder="Email"
                      />
                    ) : (
                      contact.email || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === contact.id ? (
                      <Input
                        value={editingData?.comment || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, comment: e.target.value } : null)}
                        placeholder="Комментарий"
                      />
                    ) : (
                      contact.comment || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === contact.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdate}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditing(contact)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(contact.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {isAdding && (
                <TableRow>
                  <TableCell>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Телефон"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Email"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formData.comment}
                      onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Комментарий"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
} 