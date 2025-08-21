'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CREATE_CLIENT_DELIVERY_ADDRESS, UPDATE_CLIENT_DELIVERY_ADDRESS, DELETE_CLIENT_DELIVERY_ADDRESS } from '@/lib/graphql/mutations'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface DeliveryAddress {
  id: string
  name: string
  address: string
  deliveryType: 'COURIER' | 'PICKUP' | 'POST' | 'TRANSPORT'
  comment?: string
}

interface Client {
  id: string
  deliveryAddresses: DeliveryAddress[]
}

interface DeliveryAddressesProps {
  client: Client
  onUpdate: () => void
}

export const DeliveryAddresses = ({ client, onUpdate }: DeliveryAddressesProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingData, setEditingData] = useState<DeliveryAddress | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    deliveryType: 'COURIER' as 'COURIER' | 'PICKUP' | 'POST' | 'TRANSPORT',
    comment: ''
  })

  const [createAddress] = useMutation(CREATE_CLIENT_DELIVERY_ADDRESS, {
    onCompleted: () => {
      toast.success('Адрес доставки добавлен')
      setIsAdding(false)
      setFormData({ name: '', address: '', deliveryType: 'COURIER', comment: '' })
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка добавления: ${error.message}`)
    }
  })

  const [updateAddress] = useMutation(UPDATE_CLIENT_DELIVERY_ADDRESS, {
    onCompleted: () => {
      toast.success('Адрес доставки обновлен')
      setEditingId(null)
      setEditingData(null)
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка обновления: ${error.message}`)
    }
  })

  const [deleteAddress] = useMutation(DELETE_CLIENT_DELIVERY_ADDRESS, {
    onCompleted: () => {
      toast.success('Адрес доставки удален')
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка удаления: ${error.message}`)
    }
  })

  const handleSave = async () => {
    if (!formData.name || !formData.address) {
      toast.error('Заполните обязательные поля')
      return
    }

    try {
      await createAddress({
        variables: {
          clientId: client.id,
          input: formData
        }
      })
    } catch (error) {
      console.error('Ошибка сохранения:', error)
    }
  }

  const handleUpdate = async () => {
    if (!editingData || !editingData.name || !editingData.address) {
      toast.error('Заполните обязательные поля')
      return
    }

    try {
      await updateAddress({
        variables: {
          id: editingData.id,
          input: {
            name: editingData.name,
            address: editingData.address,
            deliveryType: editingData.deliveryType,
            comment: editingData.comment
          }
        }
      })
    } catch (error) {
      console.error('Ошибка обновления:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот адрес доставки?')) {
      try {
        await deleteAddress({
          variables: { id }
        })
      } catch (error) {
        console.error('Ошибка удаления:', error)
      }
    }
  }

  const startEditing = (address: DeliveryAddress) => {
    setEditingId(address.id)
    setEditingData({ ...address })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingData(null)
  }

  const getDeliveryTypeLabel = (type: string) => {
    const labels = {
      COURIER: 'Курьер',
      PICKUP: 'Самовывоз',
      POST: 'Почта России',
      TRANSPORT: 'Транспортная компания'
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Адреса доставки</CardTitle>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить адрес доставки
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Адрес</TableHead>
              <TableHead>Вид доставки</TableHead>
              <TableHead>Комментарий</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {client.deliveryAddresses.map((address) => (
              <TableRow key={address.id}>
                <TableCell>
                  {editingId === address.id ? (
                    <Input
                      value={editingData?.name || ''}
                      onChange={(e) => setEditingData(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  ) : (
                    address.name
                  )}
                </TableCell>
                <TableCell>
                  {editingId === address.id ? (
                    <Input
                      value={editingData?.address || ''}
                      onChange={(e) => setEditingData(prev => prev ? { ...prev, address: e.target.value } : null)}
                    />
                  ) : (
                    address.address
                  )}
                </TableCell>
                <TableCell>
                  {editingId === address.id ? (
                    <Select 
                      value={editingData?.deliveryType || 'COURIER'}
                      onValueChange={(value) => setEditingData(prev => prev ? { ...prev, deliveryType: value as 'COURIER' | 'PICKUP' | 'POST' | 'TRANSPORT' } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COURIER">Курьер</SelectItem>
                        <SelectItem value="PICKUP">Самовывоз</SelectItem>
                        <SelectItem value="POST">Почта России</SelectItem>
                        <SelectItem value="TRANSPORT">Транспортная компания</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    getDeliveryTypeLabel(address.deliveryType)
                  )}
                </TableCell>
                <TableCell>
                  {editingId === address.id ? (
                    <Input
                      value={editingData?.comment || ''}
                      onChange={(e) => setEditingData(prev => prev ? { ...prev, comment: e.target.value } : null)}
                    />
                  ) : (
                    address.comment || '-'
                  )}
                </TableCell>
                <TableCell>
                  {editingId === address.id ? (
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
                      <Button size="sm" variant="outline" onClick={() => startEditing(address)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(address.id)}>
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
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Название адреса"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Полный адрес"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={formData.deliveryType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, deliveryType: value as 'COURIER' | 'PICKUP' | 'POST' | 'TRANSPORT' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COURIER">Курьер</SelectItem>
                      <SelectItem value="PICKUP">Самовывоз</SelectItem>
                      <SelectItem value="POST">Почта России</SelectItem>
                      <SelectItem value="TRANSPORT">Транспортная компания</SelectItem>
                    </SelectContent>
                  </Select>
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
      </CardContent>
    </Card>
  )
} 