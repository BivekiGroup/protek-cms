'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CREATE_CLIENT_VEHICLE, UPDATE_CLIENT_VEHICLE, DELETE_CLIENT_VEHICLE } from '@/lib/graphql/mutations'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface Vehicle {
  id: string
  name: string
  vin?: string
  frame?: string
  licensePlate?: string
  brand?: string
  model?: string
  modification?: string
  year?: number
  mileage?: number
  comment?: string
}

interface Client {
  id: string
  vehicles: Vehicle[]
}

interface GarageProps {
  client: Client
  onUpdate: () => void
}

export const Garage = ({ client, onUpdate }: GarageProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingData, setEditingData] = useState<Vehicle | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    vin: '',
    frame: '',
    licensePlate: '',
    brand: '',
    model: '',
    modification: '',
    year: '',
    mileage: '',
    comment: ''
  })

  const [createVehicle] = useMutation(CREATE_CLIENT_VEHICLE, {
    onCompleted: () => {
      toast.success('Автомобиль добавлен')
      setIsAdding(false)
      setFormData({
        name: '',
        vin: '',
        frame: '',
        licensePlate: '',
        brand: '',
        model: '',
        modification: '',
        year: '',
        mileage: '',
        comment: ''
      })
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка добавления: ${error.message}`)
    }
  })

  const [updateVehicle] = useMutation(UPDATE_CLIENT_VEHICLE, {
    onCompleted: () => {
      toast.success('Автомобиль обновлен')
      setEditingId(null)
      setEditingData(null)
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка обновления: ${error.message}`)
    }
  })

  const [deleteVehicle] = useMutation(DELETE_CLIENT_VEHICLE, {
    onCompleted: () => {
      toast.success('Автомобиль удален')
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка удаления: ${error.message}`)
    }
  })

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Заполните название автомобиля')
      return
    }

    try {
      await createVehicle({
        variables: {
          clientId: client.id,
          input: {
            name: formData.name,
            vin: formData.vin || undefined,
            frame: formData.frame || undefined,
            licensePlate: formData.licensePlate || undefined,
            brand: formData.brand || undefined,
            model: formData.model || undefined,
            modification: formData.modification || undefined,
            year: formData.year ? parseInt(formData.year) : undefined,
            mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
            comment: formData.comment || undefined
          }
        }
      })
    } catch (error) {
      console.error('Ошибка сохранения:', error)
    }
  }

  const handleUpdate = async () => {
    if (!editingData || !editingData.name) {
      toast.error('Заполните название автомобиля')
      return
    }

    try {
      await updateVehicle({
        variables: {
          id: editingData.id,
          input: {
            name: editingData.name,
            vin: editingData.vin || undefined,
            frame: editingData.frame || undefined,
            licensePlate: editingData.licensePlate || undefined,
            brand: editingData.brand || undefined,
            model: editingData.model || undefined,
            modification: editingData.modification || undefined,
            year: editingData.year || undefined,
            mileage: editingData.mileage || undefined,
            comment: editingData.comment || undefined
          }
        }
      })
    } catch (error) {
      console.error('Ошибка обновления:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот автомобиль?')) {
      try {
        await deleteVehicle({
          variables: { id }
        })
      } catch (error) {
        console.error('Ошибка удаления:', error)
      }
    }
  }

  const startEditing = (vehicle: Vehicle) => {
    setEditingId(vehicle.id)
    setEditingData({ ...vehicle })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingData(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Гараж</CardTitle>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить автомобиль
        </Button>
      </CardHeader>
      <CardContent>
        {client.vehicles.length === 0 && !isAdding ? (
          <p className="text-muted-foreground">Автомобили не добавлены</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Марка/Модель</TableHead>
                <TableHead>VIN/Рама</TableHead>
                <TableHead>Гос. номер</TableHead>
                <TableHead>Год</TableHead>
                <TableHead>Пробег</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    {editingId === vehicle.id ? (
                      <Input
                        value={editingData?.name || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                    ) : (
                      vehicle.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === vehicle.id ? (
                      <div className="space-y-1">
                        <Input
                          value={editingData?.brand || ''}
                          onChange={(e) => setEditingData(prev => prev ? { ...prev, brand: e.target.value } : null)}
                          placeholder="Марка"
                        />
                        <Input
                          value={editingData?.model || ''}
                          onChange={(e) => setEditingData(prev => prev ? { ...prev, model: e.target.value } : null)}
                          placeholder="Модель"
                        />
                      </div>
                    ) : (
                      <div>
                        {vehicle.brand && vehicle.model ? `${vehicle.brand} ${vehicle.model}` : vehicle.brand || vehicle.model || '-'}
                        {vehicle.modification && <div className="text-sm text-muted-foreground">{vehicle.modification}</div>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === vehicle.id ? (
                      <div className="space-y-1">
                        <Input
                          value={editingData?.vin || ''}
                          onChange={(e) => setEditingData(prev => prev ? { ...prev, vin: e.target.value } : null)}
                          placeholder="VIN"
                        />
                        <Input
                          value={editingData?.frame || ''}
                          onChange={(e) => setEditingData(prev => prev ? { ...prev, frame: e.target.value } : null)}
                          placeholder="Номер рамы"
                        />
                      </div>
                    ) : (
                      <div>
                        {vehicle.vin && <div>VIN: {vehicle.vin}</div>}
                        {vehicle.frame && <div>Рама: {vehicle.frame}</div>}
                        {!vehicle.vin && !vehicle.frame && '-'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === vehicle.id ? (
                      <Input
                        value={editingData?.licensePlate || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, licensePlate: e.target.value } : null)}
                      />
                    ) : (
                      vehicle.licensePlate || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === vehicle.id ? (
                      <Input
                        type="number"
                        value={editingData?.year || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, year: e.target.value ? parseInt(e.target.value) : undefined } : null)}
                      />
                    ) : (
                      vehicle.year || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === vehicle.id ? (
                      <Input
                        type="number"
                        value={editingData?.mileage || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, mileage: e.target.value ? parseInt(e.target.value) : undefined } : null)}
                      />
                    ) : (
                      vehicle.mileage ? `${vehicle.mileage.toLocaleString()} км` : '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === vehicle.id ? (
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
                        <Button size="sm" variant="outline" onClick={() => startEditing(vehicle)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(vehicle.id)}>
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
                      placeholder="Название автомобиля"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Input
                        value={formData.brand}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                        placeholder="Марка"
                      />
                      <Input
                        value={formData.model}
                        onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                        placeholder="Модель"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Input
                        value={formData.vin}
                        onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value }))}
                        placeholder="VIN"
                      />
                      <Input
                        value={formData.frame}
                        onChange={(e) => setFormData(prev => ({ ...prev, frame: e.target.value }))}
                        placeholder="Номер рамы"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formData.licensePlate}
                      onChange={(e) => setFormData(prev => ({ ...prev, licensePlate: e.target.value }))}
                      placeholder="Гос. номер"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                      placeholder="Год"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={formData.mileage}
                      onChange={(e) => setFormData(prev => ({ ...prev, mileage: e.target.value }))}
                      placeholder="Пробег"
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