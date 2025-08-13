"use client"

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { CREATE_CLIENT } from '@/lib/graphql/mutations'
import { GET_CLIENTS } from '@/lib/graphql/queries'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CreateClientModal = ({ isOpen, onClose }: CreateClientModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'LEGAL_ENTITY',
    markup: '',
    isConfirmed: false,
    notes: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  const [createClient] = useMutation(CREATE_CLIENT, {
    refetchQueries: [{ query: GET_CLIENTS }],
    onCompleted: () => {
      toast.success("Клиент успешно создан")
      handleClose()
    },
    onError: (error) => {
      toast.error(`Ошибка создания клиента: ${error.message}`)
    }
  })

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      type: 'INDIVIDUAL',
      markup: '',
      isConfirmed: false,
      notes: ''
    })
    setIsLoading(false)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("Заполните обязательные поля")
      return
    }

    setIsLoading(true)

    try {
      await createClient({
        variables: {
          input: {
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim(),
            type: formData.type,
            markup: formData.markup ? parseFloat(formData.markup) : null,
            isConfirmed: formData.isConfirmed,
            notes: formData.notes.trim() || null
          }
        }
      })
    } catch (error) {
      console.error('Ошибка создания клиента:', error)
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Создать нового клиента</DialogTitle>
          <DialogDescription>
            Заполните информацию о новом клиенте. Поля отмеченные * обязательны для заполнения.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Введите имя клиента"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Тип клиента *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">Физическое лицо</SelectItem>
                  <SelectItem value="LEGAL_ENTITY">Юридическое лицо</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+7 (999) 123-45-67"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="client@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="markup">Наценка (%)</Label>
            <Input
              id="markup"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.markup}
              onChange={(e) => handleInputChange('markup', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Дополнительная информация о клиенте"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isConfirmed"
              checked={formData.isConfirmed}
              onCheckedChange={(checked) => handleInputChange('isConfirmed', checked)}
            />
            <Label htmlFor="isConfirmed">Подтвержденный клиент</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Создание...' : 'Создать клиента'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 