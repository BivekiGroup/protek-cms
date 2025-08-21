"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Filter } from 'lucide-react'

interface ClientsFiltersProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilters: (filters: FilterValues) => void
  currentFilters: FilterValues
}

export interface FilterValues {
  type?: 'INDIVIDUAL' | 'LEGAL_ENTITY' | 'ALL'
  isConfirmed?: boolean | 'ALL'
  markupMin?: number
  markupMax?: number
  registrationDateFrom?: string
  registrationDateTo?: string
  hasEmail?: boolean | 'ALL'
  hasProfile?: boolean | 'ALL'
}

export const ClientsFilters = ({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  currentFilters 
}: ClientsFiltersProps) => {
  const [filters, setFilters] = useState<FilterValues>(currentFilters)

  const handleFilterChange = (key: keyof FilterValues, value: string | number | boolean | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleApply = () => {
    onApplyFilters(filters)
    onClose()
  }

  const handleReset = () => {
    const resetFilters: FilterValues = {
      type: 'ALL',
      isConfirmed: 'ALL',
      markupMin: undefined,
      markupMax: undefined,
      registrationDateFrom: '',
      registrationDateTo: '',
      hasEmail: 'ALL',
      hasProfile: 'ALL'
    }
    setFilters(resetFilters)
    onApplyFilters(resetFilters)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.type && filters.type !== 'ALL') count++
    if (filters.isConfirmed !== 'ALL') count++
    if (filters.markupMin !== undefined) count++
    if (filters.markupMax !== undefined) count++
    if (filters.registrationDateFrom) count++
    if (filters.registrationDateTo) count++
    if (filters.hasEmail !== 'ALL') count++
    if (filters.hasProfile !== 'ALL') count++
    return count
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры клиентов
            {getActiveFiltersCount() > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {getActiveFiltersCount()}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Настройте фильтры для поиска клиентов по различным критериям.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Тип клиента */}
          <div className="space-y-2">
            <Label>Тип клиента</Label>
            <Select
              value={filters.type || 'ALL'}
              onValueChange={(value) => handleFilterChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все типы</SelectItem>
                <SelectItem value="INDIVIDUAL">Физические лица</SelectItem>
                <SelectItem value="LEGAL_ENTITY">Юридические лица</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Статус подтверждения */}
          <div className="space-y-2">
            <Label>Статус подтверждения</Label>
            <Select
              value={filters.isConfirmed?.toString() || 'ALL'}
              onValueChange={(value) => 
                handleFilterChange('isConfirmed', value === 'ALL' ? 'ALL' : value === 'true')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все статусы</SelectItem>
                <SelectItem value="true">Подтвержденные</SelectItem>
                <SelectItem value="false">Не подтвержденные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Наценка */}
          <div className="space-y-4">
            <Label>Наценка (%)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="markupMin" className="text-sm text-gray-600">От</Label>
                <Input
                  id="markupMin"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={filters.markupMin || ''}
                  onChange={(e) => 
                    handleFilterChange('markupMin', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="markupMax" className="text-sm text-gray-600">До</Label>
                <Input
                  id="markupMax"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="100"
                  value={filters.markupMax || ''}
                  onChange={(e) => 
                    handleFilterChange('markupMax', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Дата регистрации */}
          <div className="space-y-4">
            <Label>Дата регистрации</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-sm text-gray-600">С</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.registrationDateFrom || ''}
                  onChange={(e) => handleFilterChange('registrationDateFrom', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-sm text-gray-600">По</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.registrationDateTo || ''}
                  onChange={(e) => handleFilterChange('registrationDateTo', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Дополнительные фильтры */}
          <div className="space-y-4">
            <Label>Дополнительные критерии</Label>
            
            <div className="space-y-2">
              <Label>Наличие email</Label>
              <Select
                value={filters.hasEmail?.toString() || 'ALL'}
                onValueChange={(value) => 
                  handleFilterChange('hasEmail', value === 'ALL' ? 'ALL' : value === 'true')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Не важно</SelectItem>
                  <SelectItem value="true">Есть email</SelectItem>
                  <SelectItem value="false">Нет email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Наличие профиля</Label>
              <Select
                value={filters.hasProfile?.toString() || 'ALL'}
                onValueChange={(value) => 
                  handleFilterChange('hasProfile', value === 'ALL' ? 'ALL' : value === 'true')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Не важно</SelectItem>
                  <SelectItem value="true">Есть профиль</SelectItem>
                  <SelectItem value="false">Нет профиля</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
          >
            Сбросить
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button onClick={handleApply}>
            Применить фильтры
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 