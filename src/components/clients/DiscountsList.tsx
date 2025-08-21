"use client"

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Check, X, Edit } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GET_DISCOUNTS } from '@/lib/graphql/queries'
import { GET_CLIENT_PROFILES } from '@/lib/graphql/queries'
import { CREATE_DISCOUNT, UPDATE_DISCOUNT, DELETE_DISCOUNT } from '@/lib/graphql/mutations'
import { toast } from 'sonner'

interface Discount {
  id: string
  name: string
  type: 'DISCOUNT' | 'PROMOCODE'
  code?: string
  minOrderAmount?: number
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  isActive: boolean
  validFrom?: string
  validTo?: string
  profiles: {
    id: string
    profile: {
      id: string
      name: string
    }
  }[]
  createdAt: string
  updatedAt: string
}



interface EditingDiscount {
  id?: string
  name: string
  type: 'DISCOUNT' | 'PROMOCODE'
  code: string
  minOrderAmount: number
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  isActive: boolean
  profileIds: string[]
}

export const DiscountsList = () => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<EditingDiscount | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // GraphQL запросы
  const { data: discountsData, loading: discountsLoading, error: discountsError, refetch } = useQuery(GET_DISCOUNTS)
  const { data: profilesData } = useQuery(GET_CLIENT_PROFILES)
  
  // GraphQL мутации
  const [createDiscount] = useMutation(CREATE_DISCOUNT, {
    onCompleted: () => {
      toast.success('Скидка успешно создана')
      refetch()
      setIsCreating(false)
      setEditingData(null)
    },
    onError: (error) => {
      toast.error(`Ошибка создания скидки: ${error.message}`)
    }
  })

  const [updateDiscount] = useMutation(UPDATE_DISCOUNT, {
    onCompleted: () => {
      toast.success('Скидка успешно обновлена')
      refetch()
      setEditingId(null)
      setEditingData(null)
    },
    onError: (error) => {
      toast.error(`Ошибка обновления скидки: ${error.message}`)
    }
  })

  const [deleteDiscount] = useMutation(DELETE_DISCOUNT, {
    onCompleted: () => {
      toast.success('Скидка успешно удалена')
      refetch()
    },
    onError: (error) => {
      toast.error(`Ошибка удаления скидки: ${error.message}`)
    }
  })

  const discounts = discountsData?.discounts || []
  const profiles = profilesData?.clientProfiles || []

  const handleStartEdit = (discount: Discount) => {
    setEditingId(discount.id)
    setEditingData({
      id: discount.id,
      name: discount.name,
      type: discount.type,
      code: discount.code || '',
      minOrderAmount: discount.minOrderAmount || 0,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      isActive: discount.isActive,
      profileIds: discount.profiles.map(p => p.profile.id)
    })
  }

  const handleStartCreate = () => {
    setIsCreating(true)
    setEditingData({
      name: '',
      type: 'DISCOUNT',
      code: '',
      minOrderAmount: 0,
      discountType: 'PERCENTAGE',
      discountValue: 0,
      isActive: true,
      profileIds: []
    })
  }

  const handleSave = async () => {
    if (!editingData) return

    try {
      const input = {
        name: editingData.name,
        type: editingData.type,
        code: editingData.code || undefined,
        minOrderAmount: editingData.minOrderAmount,
        discountType: editingData.discountType,
        discountValue: editingData.discountValue,
        isActive: editingData.isActive,
        profileIds: editingData.profileIds
      }

      if (isCreating) {
        await createDiscount({ variables: { input } })
      } else if (editingData.id) {
        await updateDiscount({ variables: { id: editingData.id, input } })
      }
    } catch (error) {
      console.error('Ошибка сохранения скидки:', error)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsCreating(false)
    setEditingData(null)
  }

  const handleDelete = async (discountId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту скидку?')) {
      try {
        await deleteDiscount({ variables: { id: discountId } })
      } catch (error) {
        console.error('Ошибка удаления скидки:', error)
      }
    }
  }

  const handleProfileToggle = (profileId: string, checked: boolean) => {
    if (!editingData) return
    
    setEditingData(prev => ({
      ...prev!,
      profileIds: checked 
        ? [...prev!.profileIds, profileId]
        : prev!.profileIds.filter(id => id !== profileId)
    }))
  }



  const getProfilesText = (discountProfiles: Discount['profiles']) => {
    if (discountProfiles.length === 0) return 'Все профили'
    return discountProfiles.map(p => p.profile.name).join(', ')
  }

  if (discountsLoading) return <div>Загрузка...</div>
  if (discountsError) return <div>Ошибка: {discountsError.message}</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Скидки и промокоды
          <Button onClick={handleStartCreate} disabled={isCreating || editingId !== null}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить скидку
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Код для скидки</TableHead>
              <TableHead>Профили</TableHead>
              <TableHead>Сумма заказа от</TableHead>
              <TableHead>Скидка %</TableHead>
              <TableHead>Фикс скидка</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isCreating && editingData && (
              <TableRow>
                <TableCell>
                  <Input
                    value={editingData.name}
                    onChange={(e) => setEditingData(prev => ({ ...prev!, name: e.target.value }))}
                    placeholder="Название скидки"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={editingData.type}
                    onValueChange={(value: 'DISCOUNT' | 'PROMOCODE') => 
                      setEditingData(prev => ({ ...prev!, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DISCOUNT">Скидка</SelectItem>
                      <SelectItem value="PROMOCODE">Промокод</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    value={editingData.code}
                    onChange={(e) => setEditingData(prev => ({ ...prev!, code: e.target.value }))}
                    placeholder="Код промокода"
                    disabled={editingData.type === 'DISCOUNT'}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-2 max-w-48">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {profiles.map((profile: any) => (
                      <div key={profile.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`profile-${profile.id}`}
                          checked={editingData.profileIds.includes(profile.id)}
                          onCheckedChange={(checked) => handleProfileToggle(profile.id, !!checked)}
                        />
                        <label htmlFor={`profile-${profile.id}`} className="text-sm">
                          {profile.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={editingData.minOrderAmount}
                    onChange={(e) => setEditingData(prev => ({ 
                      ...prev!, 
                      minOrderAmount: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0"
                  />
                </TableCell>
                <TableCell>
                  {editingData.discountType === 'PERCENTAGE' ? (
                    <Input
                      type="number"
                      value={editingData.discountValue}
                      onChange={(e) => setEditingData(prev => ({ 
                        ...prev!, 
                        discountValue: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0"
                    />
                  ) : (
                    <Select
                      value={editingData.discountType}
                      onValueChange={(value: 'PERCENTAGE' | 'FIXED_AMOUNT') => 
                        setEditingData(prev => ({ ...prev!, discountType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Процент</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Фикс сумма</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  {editingData.discountType === 'FIXED_AMOUNT' ? (
                    <Input
                      type="number"
                      value={editingData.discountValue}
                      onChange={(e) => setEditingData(prev => ({ 
                        ...prev!, 
                        discountValue: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0"
                    />
                  ) : (
                    <Select
                      value={editingData.discountType}
                      onValueChange={(value: 'PERCENTAGE' | 'FIXED_AMOUNT') => 
                        setEditingData(prev => ({ ...prev!, discountType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Процент</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Фикс сумма</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {discounts.map((discount: any) => (
              <TableRow key={discount.id}>
                <TableCell>
                  {editingId === discount.id && editingData ? (
                    <Input
                      value={editingData.name}
                      onChange={(e) => setEditingData(prev => ({ ...prev!, name: e.target.value }))}
                    />
                  ) : (
                    discount.name
                  )}
                </TableCell>
                <TableCell>
                  {editingId === discount.id && editingData ? (
                    <Select
                      value={editingData.type}
                      onValueChange={(value: 'DISCOUNT' | 'PROMOCODE') => 
                        setEditingData(prev => ({ ...prev!, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DISCOUNT">Скидка</SelectItem>
                        <SelectItem value="PROMOCODE">Промокод</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={discount.type === 'PROMOCODE' ? 'default' : 'secondary'}>
                      {discount.type === 'PROMOCODE' ? 'Промокод' : 'Скидка'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === discount.id && editingData ? (
                    <Input
                      value={editingData.code}
                      onChange={(e) => setEditingData(prev => ({ ...prev!, code: e.target.value }))}
                      disabled={editingData.type === 'DISCOUNT'}
                    />
                  ) : (
                    discount.code || '-'
                  )}
                </TableCell>
                <TableCell>
                  {editingId === discount.id && editingData ? (
                    <div className="space-y-2 max-w-48">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {profiles.map((profile: any) => (
                        <div key={profile.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-profile-${profile.id}`}
                            checked={editingData.profileIds.includes(profile.id)}
                            onCheckedChange={(checked) => handleProfileToggle(profile.id, !!checked)}
                          />
                          <label htmlFor={`edit-profile-${profile.id}`} className="text-sm">
                            {profile.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm">{getProfilesText(discount.profiles)}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === discount.id && editingData ? (
                    <Input
                      type="number"
                      value={editingData.minOrderAmount}
                      onChange={(e) => setEditingData(prev => ({ 
                        ...prev!, 
                        minOrderAmount: parseFloat(e.target.value) || 0 
                      }))}
                    />
                  ) : (
                    `${discount.minOrderAmount || 0} ₽`
                  )}
                </TableCell>
                <TableCell>
                  {editingId === discount.id && editingData ? (
                    editingData.discountType === 'PERCENTAGE' ? (
                      <Input
                        type="number"
                        value={editingData.discountValue}
                        onChange={(e) => setEditingData(prev => ({ 
                          ...prev!, 
                          discountValue: parseFloat(e.target.value) || 0 
                        }))}
                      />
                    ) : '-'
                  ) : (
                    discount.discountType === 'PERCENTAGE' ? `${discount.discountValue}%` : '-'
                  )}
                </TableCell>
                <TableCell>
                  {editingId === discount.id && editingData ? (
                    editingData.discountType === 'FIXED_AMOUNT' ? (
                      <Input
                        type="number"
                        value={editingData.discountValue}
                        onChange={(e) => setEditingData(prev => ({ 
                          ...prev!, 
                          discountValue: parseFloat(e.target.value) || 0 
                        }))}
                      />
                    ) : '-'
                  ) : (
                    discount.discountType === 'FIXED_AMOUNT' ? `${discount.discountValue} ₽` : '-'
                  )}
                </TableCell>
                <TableCell>
                  {editingId === discount.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleStartEdit(discount)}
                        disabled={isCreating || editingId !== null}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDelete(discount.id)}
                        disabled={isCreating || editingId !== null}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {discounts.length === 0 && !isCreating && (
          <div className="text-center py-8 text-gray-500">
            Нет созданных скидок
          </div>
        )}
      </CardContent>
    </Card>
  )
} 