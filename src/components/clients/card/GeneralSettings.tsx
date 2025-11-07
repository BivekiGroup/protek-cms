'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { UPDATE_CLIENT, UPDATE_CLIENT_BALANCE, DELETE_CLIENT } from '@/lib/graphql/mutations'
import { GET_CLIENT_PROFILES, GET_USERS_FOR_MANAGER } from '@/lib/graphql/queries'
import { Trash2, Save } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface Client {
  id: string
  clientNumber: string
  type: 'INDIVIDUAL' | 'LEGAL_ENTITY'
  name: string
  email?: string
  phone: string
  city?: string
  markup?: number
  isConfirmed: boolean
  profileId?: string
  profile?: {
    id: string
    name: string
  }
  managerId?: string
  manager?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  balance: number
  comment?: string
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  legalEntityType?: string
  legalEntityName?: string
  inn?: string
  kpp?: string
  ogrn?: string
  okpo?: string
  legalAddress?: string
  actualAddress?: string
  bankAccount?: string
  bankName?: string
  bankBik?: string
  correspondentAccount?: string
  legalEntities?: Array<{
    id: string
    shortName: string
    fullName: string
  }>
  balanceHistory: Array<{
    id: string
    userId: string
    user: {
      id: string
      firstName: string
      lastName: string
      email: string
    }
    oldValue: number
    newValue: number
    comment?: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

interface GeneralSettingsProps {
  client: Client
  onUpdate: () => void
}

export const GeneralSettings = ({ client, onUpdate }: GeneralSettingsProps) => {
  // Определяем реальный тип клиента на основе наличия юридических лиц
  const actualClientType = (client.legalEntities && client.legalEntities.length > 0)
    ? 'LEGAL_ENTITY'
    : 'INDIVIDUAL'

  const [formData, setFormData] = useState({
    name: client.name,
    type: actualClientType,
    email: client.email || '',
    phone: client.phone,
    profileId: client.profileId || '',
    managerId: client.managerId || '',
    emailNotifications: client.emailNotifications,
    smsNotifications: client.smsNotifications,
    pushNotifications: client.pushNotifications,
    comment: client.comment || ''
  })

  const [newBalance, setNewBalance] = useState(client.balance.toString())
  const [balanceComment, setBalanceComment] = useState('')

  const { data: profilesData } = useQuery(GET_CLIENT_PROFILES)
  const { data: usersData } = useQuery(GET_USERS_FOR_MANAGER)

  const [updateClient, { loading: updateLoading }] = useMutation(UPDATE_CLIENT, {
    onCompleted: () => {
      toast.success('Данные клиента обновлены')
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка обновления: ${error.message}`)
    }
  })

  const [updateBalance, { loading: balanceLoading }] = useMutation(UPDATE_CLIENT_BALANCE, {
    onCompleted: () => {
      toast.success('Баланс клиента обновлен')
      setBalanceComment('')
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка обновления баланса: ${error.message}`)
    }
  })

  const [deleteClient, { loading: deleteLoading }] = useMutation(DELETE_CLIENT, {
    onCompleted: () => {
      toast.success('Клиент удален')
      // Перенаправляем на список клиентов
      window.location.href = '/dashboard/clients'
    },
    onError: (error) => {
      toast.error(`Ошибка удаления: ${error.message}`)
    }
  })

  const handleSave = async () => {
    try {
      await updateClient({
        variables: {
          id: client.id,
          input: {
            ...formData,
            markup: client.markup,
            isConfirmed: client.isConfirmed
          },
          vehicles: [],
          discounts: []
        }
      })
    } catch (error) {
      console.error('Ошибка сохранения:', error)
    }
  }

  const handleBalanceUpdate = async () => {
    const balance = parseFloat(newBalance)
    if (isNaN(balance)) {
      toast.error('Введите корректное значение баланса')
      return
    }

    try {
      await updateBalance({
        variables: {
          id: client.id,
          newBalance: balance,
          comment: balanceComment || undefined
        }
      })
    } catch (error) {
      console.error('Ошибка обновления баланса:', error)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDeleteClient = async () => {
    try {
      await deleteClient({
        variables: {
          id: client.id
        }
      })
    } catch (error) {
      console.error('Ошибка удаления клиента:', error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Общие настройки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Основная информация */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Номер клиента</Label>
              <Input value={client.clientNumber} disabled />
            </div>
            <div className="space-y-2">
              <Label>Имя</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Тип пользователя</Label>
              <Input
                value={actualClientType === 'INDIVIDUAL' ? 'Физическое лицо' : 'Юридическое лицо'}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                {actualClientType === 'LEGAL_ENTITY'
                  ? `Определяется автоматически (есть ${client.legalEntities?.length || 0} юр. лиц)`
                  : 'Определяется автоматически (нет юр. лиц)'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Номер телефона</Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Тип профиля</Label>
              <Select
                value={formData.profileId}
                onValueChange={(value) => handleInputChange('profileId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите профиль" />
                </SelectTrigger>
                <SelectContent>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {profilesData?.clientProfiles?.map((profile: any) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Уведомления */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Уведомления</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email-notifications"
                  checked={formData.emailNotifications}
                  onCheckedChange={(checked) => handleInputChange('emailNotifications', checked as boolean)}
                />
                <Label htmlFor="email-notifications">Email уведомления</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sms-notifications"
                  checked={formData.smsNotifications}
                  onCheckedChange={(checked) => handleInputChange('smsNotifications', checked as boolean)}
                />
                <Label htmlFor="sms-notifications">SMS уведомления</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="push-notifications"
                  checked={formData.pushNotifications}
                  onCheckedChange={(checked) => handleInputChange('pushNotifications', checked as boolean)}
                />
                <Label htmlFor="push-notifications">Push уведомления</Label>
              </div>
            </div>
          </div>

          {/* Статус и менеджер */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Статус регистрации</Label>
              <Select value={client.isConfirmed ? 'confirmed' : 'pending'} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Подтвержден</SelectItem>
                  <SelectItem value="pending">Ожидает подтверждения</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Дата регистрации</Label>
              <Input value={new Date(client.createdAt).toLocaleDateString('ru-RU')} disabled />
            </div>
            <div className="space-y-2">
              <Label>Личный менеджер</Label>
              <Select
                value={formData.managerId}
                onValueChange={(value) => handleInputChange('managerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите менеджера" />
                </SelectTrigger>
                <SelectContent>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {usersData?.users?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Баланс */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Баланс</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Текущий баланс</Label>
                <Input value={`${client.balance} ₽`} disabled />
              </div>
              <div className="space-y-2">
                <Label>Новое значение</Label>
                <Input
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Комментарий к изменению</Label>
                <Input
                  value={balanceComment}
                  onChange={(e) => setBalanceComment(e.target.value)}
                  placeholder="Причина изменения баланса"
                />
              </div>
            </div>
            {parseFloat(newBalance) !== client.balance && (
              <Button
                onClick={handleBalanceUpdate}
                disabled={balanceLoading}
                variant="outline"
                size="sm"
              >
                Обновить баланс
              </Button>
            )}
          </div>

          {/* История изменений баланса */}
          {client.balanceHistory.length > 0 && (
            <div className="space-y-4">
              <Label className="text-base font-medium">История изменений баланса</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {client.balanceHistory.map((history) => (
                  <div key={history.id} className="p-3 border rounded-lg text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p>
                          <span className="font-medium">{history.user.firstName} {history.user.lastName}</span>
                          {' '}изменил баланс с {history.oldValue} ₽ на {history.newValue} ₽
                        </p>
                        {history.comment && (
                          <p className="text-muted-foreground mt-1">{history.comment}</p>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(history.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Комментарий */}
          <div className="space-y-2">
            <Label>Комментарий</Label>
            <Textarea
              value={formData.comment}
              onChange={(e) => handleInputChange('comment', e.target.value)}
              placeholder="Дополнительная информация о клиенте"
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-between">
            <Button
              onClick={handleSave}
              disabled={updateLoading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Сохранить изменения
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Удалить пользователя
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить клиента?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Это действие нельзя отменить. Клиент и все связанные с ним данные будут удалены навсегда.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteClient}
                    disabled={deleteLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteLoading ? 'Удаление...' : 'Удалить'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 