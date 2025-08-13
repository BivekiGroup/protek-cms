"use client"

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
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
import { ProfileFormDialog } from './ProfileFormDialog'
import { GET_CLIENT_PROFILES } from '@/lib/graphql/queries'
import { CREATE_CLIENT_PROFILE, UPDATE_CLIENT_PROFILE, DELETE_CLIENT_PROFILE } from '@/lib/graphql/mutations'
import { toast } from 'sonner'

// Расширенные типы данных согласно ТЗ
interface ClientProfile {
  id: string
  code: string
  name: string
  description?: string
  baseMarkup: number
  autoSendInvoice: boolean
  vinRequestModule: boolean
  priceRangeMarkups: ProfilePriceRangeMarkup[]
  orderDiscounts: ProfileOrderDiscount[]
  supplierMarkups: ProfileSupplierMarkup[]
  brandMarkups: ProfileBrandMarkup[]
  categoryMarkups: ProfileCategoryMarkup[]
  excludedBrands: ProfileExcludedBrand[]
  excludedCategories: ProfileExcludedCategory[]
  paymentTypes: ProfilePaymentType[]
  _count: {
    clients: number
  }
  createdAt: string
  updatedAt: string
}

interface ProfilePriceRangeMarkup {
  id: string
  priceFrom: number
  priceTo: number
  markupType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  markupValue: number
}

interface ProfileOrderDiscount {
  id: string
  minOrderSum: number
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
}

interface ProfileSupplierMarkup {
  id: string
  supplierName: string
  markupType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  markupValue: number
}

interface ProfileBrandMarkup {
  id: string
  brandName: string
  markupType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  markupValue: number
}

interface ProfileCategoryMarkup {
  id: string
  categoryName: string
  markupType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  markupValue: number
}

interface ProfileExcludedBrand {
  id: string
  brandName: string
}

interface ProfileExcludedCategory {
  id: string
  categoryName: string
}

interface ProfilePaymentType {
  id: string
  paymentType: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE' | 'CREDIT'
  isEnabled: boolean
}

interface ProfileFormData {
  code: string
  name: string
  description: string
  baseMarkup: number
  autoSendInvoice: boolean
  vinRequestModule: boolean
  priceRangeMarkups: Omit<ProfilePriceRangeMarkup, 'id'>[]
  orderDiscounts: Omit<ProfileOrderDiscount, 'id'>[]
  supplierMarkups: Omit<ProfileSupplierMarkup, 'id'>[]
  brandMarkups: Omit<ProfileBrandMarkup, 'id'>[]
  categoryMarkups: Omit<ProfileCategoryMarkup, 'id'>[]
  excludedBrands: string[]
  excludedCategories: string[]
  paymentTypes: Omit<ProfilePaymentType, 'id'>[]
}

export const ProfilesList = () => {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ClientProfile | null>(null)

  // GraphQL запросы
  const { data, loading, error, refetch } = useQuery(GET_CLIENT_PROFILES)
  
  // GraphQL мутации
  const [createProfile] = useMutation(CREATE_CLIENT_PROFILE, {
    onCompleted: () => {
      toast.success('Профиль успешно создан')
      refetch()
    },
    onError: (error) => {
      toast.error(`Ошибка создания профиля: ${error.message}`)
    }
  })

  const [updateProfile] = useMutation(UPDATE_CLIENT_PROFILE, {
    onCompleted: () => {
      toast.success('Профиль успешно обновлен')
      refetch()
    },
    onError: (error) => {
      toast.error(`Ошибка обновления профиля: ${error.message}`)
    }
  })

  const [deleteProfile] = useMutation(DELETE_CLIENT_PROFILE, {
    onCompleted: () => {
      toast.success('Профиль успешно удален')
      refetch()
    },
    onError: (error) => {
      toast.error(`Ошибка удаления профиля: ${error.message}`)
    }
  })

  const profiles = data?.clientProfiles || []

  const handleAddProfile = () => {
    setEditingProfile(null)
    setIsFormOpen(true)
  }

  const handleEditProfile = (profile: ClientProfile) => {
    setEditingProfile(profile)
    setIsFormOpen(true)
  }

  const handleDeleteProfile = async (profileId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот профиль?')) {
      try {
        await deleteProfile({
          variables: { id: profileId }
        })
      } catch (error) {
        console.error('Ошибка удаления профиля:', error)
      }
    }
  }

  const handleSaveProfile = async (profileData: ProfileFormData) => {
    try {
      if (editingProfile) {
        // Обновление существующего профиля
        await updateProfile({
          variables: {
            id: editingProfile.id,
            input: profileData
          }
        })
      } else {
        // Создание нового профиля
        await createProfile({
          variables: {
            input: profileData
          }
        })
      }
      setIsFormOpen(false)
      setEditingProfile(null)
    } catch (error) {
      console.error('Ошибка сохранения профиля:', error)
    }
  }

  const formatMarkupValue = (type: 'PERCENTAGE' | 'FIXED_AMOUNT', value: number) => {
    return type === 'PERCENTAGE' ? `${value}%` : `${value.toLocaleString('ru-RU')} ₽`
  }

  const getPaymentTypesLabel = (paymentTypes: ProfilePaymentType[]) => {
    const enabled = paymentTypes.filter(pt => pt.isEnabled)
    return enabled.length
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Профили клиентов</h3>
            <p className="text-sm text-gray-500">
              Управление профилями и наценками для разных групп пользователей
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-gray-500">Загрузка профилей...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Профили клиентов</h3>
            <p className="text-sm text-gray-500">
              Управление профилями и наценками для разных групп пользователей
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-red-500">
              Ошибка загрузки профилей: {error.message}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Заголовок и действия */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Профили клиентов</h3>
          <p className="text-sm text-gray-500">
            Управление профилями и наценками для разных групп пользователей
          </p>
        </div>
        <Button onClick={handleAddProfile}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить профиль
        </Button>
      </div>

      {/* Таблица профилей */}
      <Card>
        <CardHeader>
          <CardTitle>Список профилей ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead>Комментарий</TableHead>
                  <TableHead>Наценка базовая</TableHead>
                  <TableHead>Наценка от стоимости товара</TableHead>
                  <TableHead>Скидка от суммы заказа</TableHead>
                  <TableHead>Наценки от поставщиков</TableHead>
                  <TableHead>Исключенные из поиска</TableHead>
                  <TableHead>Типы платежей</TableHead>
                  <TableHead>Управление</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {profiles.map((profile: any) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.code}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{profile.name}</div>
                        <div className="text-sm text-gray-500">
                          {profile._count?.clients || 0} клиентов
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {profile.description || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {profile.baseMarkup}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {profile.priceRangeMarkups.length > 0 ? (
                        <div className="space-y-1">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {profile.priceRangeMarkups.slice(0, 2).map((markup: any) => (
                            <div key={markup.id} className="text-xs">
                              {markup.priceFrom.toLocaleString('ru-RU')} - {markup.priceTo.toLocaleString('ru-RU')} ₽: {formatMarkupValue(markup.markupType, markup.markupValue)}
                            </div>
                          ))}
                          {profile.priceRangeMarkups.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{profile.priceRangeMarkups.length - 2} еще
                            </div>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.orderDiscounts.length > 0 ? (
                        <div className="space-y-1">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {profile.orderDiscounts.map((discount: any) => (
                            <div key={discount.id} className="text-xs">
                              {discount.minOrderSum.toLocaleString('ru-RU')} ₽ - {formatMarkupValue(discount.discountType, discount.discountValue)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.supplierMarkups.length > 0 ? (
                        <Badge variant="outline">
                          {profile.supplierMarkups.length} шт.
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {profile.excludedBrands.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">Бренды:</span>
                            <Badge variant="secondary" className="text-xs">
                              {profile.excludedBrands.length} шт.
                            </Badge>
                          </div>
                        )}
                        {profile.excludedCategories.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">Группы:</span>
                            <Badge variant="secondary" className="text-xs">
                              {profile.excludedCategories.length} шт.
                            </Badge>
                          </div>
                        )}
                        {profile.excludedBrands.length === 0 && profile.excludedCategories.length === 0 && '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPaymentTypesLabel(profile.paymentTypes)} шт.
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditProfile(profile)}
                          title="Редактировать"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteProfile(profile.id)}
                          disabled={profile._count?.clients > 0}
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {profiles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Нет профилей
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог формы профиля */}
      <ProfileFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        profile={editingProfile}
        onSave={handleSaveProfile}
      />
    </div>
  )
} 