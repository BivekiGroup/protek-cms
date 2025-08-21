"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X } from 'lucide-react'

// Типы данных
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

interface ProfileFormDialogProps {
  isOpen: boolean
  onClose: () => void
  profile?: ClientProfile | null
  onSave: (data: ProfileFormData) => void
}

// Временные данные для поиска
const mockBrands = ['BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Toyota', 'Honda', 'Ford', 'Chevrolet']
const mockCategories = ['Фильтры', 'Масла', 'Тормозные диски', 'Свечи', 'Аккумуляторы', 'Шины', 'Амортизаторы']
const mockSuppliers = ['Поставщик 1', 'Поставщик 2', 'Поставщик 3', 'Поставщик 4', 'Поставщик 5']

const paymentTypeLabels = {
  CASH: 'Наличные',
  CARD: 'Банковская карта',
  BANK_TRANSFER: 'Банковский перевод',
  ONLINE: 'Онлайн платежи',
  CREDIT: 'В кредит'
}

export const ProfileFormDialog = ({ isOpen, onClose, profile, onSave }: ProfileFormDialogProps) => {
  const [formData, setFormData] = useState<ProfileFormData>({
    code: '',
    name: '',
    description: '',
    baseMarkup: 0,
    autoSendInvoice: true,
    vinRequestModule: false,
    priceRangeMarkups: [],
    orderDiscounts: [],
    supplierMarkups: [],
    brandMarkups: [],
    categoryMarkups: [],
    excludedBrands: [],
    excludedCategories: [],
    paymentTypes: [
      { paymentType: 'CASH', isEnabled: true },
      { paymentType: 'CARD', isEnabled: true },
      { paymentType: 'BANK_TRANSFER', isEnabled: true },
      { paymentType: 'ONLINE', isEnabled: false },
      { paymentType: 'CREDIT', isEnabled: false }
    ]
  })

  const [brandSearch, setBrandSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')

  // Заполнение формы при редактировании
  useEffect(() => {
    if (profile) {
      setFormData({
        code: profile.code,
        name: profile.name,
        description: profile.description || '',
        baseMarkup: profile.baseMarkup,
        autoSendInvoice: profile.autoSendInvoice,
        vinRequestModule: profile.vinRequestModule,
        priceRangeMarkups: profile.priceRangeMarkups.map(item => ({
          priceFrom: item.priceFrom,
          priceTo: item.priceTo,
          markupType: item.markupType,
          markupValue: item.markupValue
        })),
        orderDiscounts: profile.orderDiscounts.map(item => ({
          minOrderSum: item.minOrderSum,
          discountType: item.discountType,
          discountValue: item.discountValue
        })),
        supplierMarkups: profile.supplierMarkups.map(item => ({
          supplierName: item.supplierName,
          markupType: item.markupType,
          markupValue: item.markupValue
        })),
        brandMarkups: profile.brandMarkups.map(item => ({
          brandName: item.brandName,
          markupType: item.markupType,
          markupValue: item.markupValue
        })),
        categoryMarkups: profile.categoryMarkups.map(item => ({
          categoryName: item.categoryName,
          markupType: item.markupType,
          markupValue: item.markupValue
        })),
        excludedBrands: profile.excludedBrands.map(b => b.brandName),
        excludedCategories: profile.excludedCategories.map(c => c.categoryName),
        paymentTypes: profile.paymentTypes.map(item => ({
          paymentType: item.paymentType,
          isEnabled: item.isEnabled
        }))
      })
    } else {
      // Сброс формы для нового профиля
      setFormData({
        code: '',
        name: '',
        description: '',
        baseMarkup: 0,
        autoSendInvoice: true,
        vinRequestModule: false,
        priceRangeMarkups: [],
        orderDiscounts: [],
        supplierMarkups: [],
        brandMarkups: [],
        categoryMarkups: [],
        excludedBrands: [],
        excludedCategories: [],
        paymentTypes: [
          { paymentType: 'CASH', isEnabled: true },
          { paymentType: 'CARD', isEnabled: true },
          { paymentType: 'BANK_TRANSFER', isEnabled: true },
          { paymentType: 'ONLINE', isEnabled: false },
          { paymentType: 'CREDIT', isEnabled: false }
        ]
      })
    }
  }, [profile])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const addPriceRangeMarkup = () => {
    setFormData(prev => ({
      ...prev,
      priceRangeMarkups: [...prev.priceRangeMarkups, {
        priceFrom: 0,
        priceTo: 0,
        markupType: 'PERCENTAGE',
        markupValue: 0
      }]
    }))
  }

  const removePriceRangeMarkup = (index: number) => {
    setFormData(prev => ({
      ...prev,
      priceRangeMarkups: prev.priceRangeMarkups.filter((_, i) => i !== index)
    }))
  }

  const updatePriceRangeMarkup = (index: number, field: keyof Omit<ProfilePriceRangeMarkup, 'id'>, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      priceRangeMarkups: prev.priceRangeMarkups.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const addBrandMarkup = () => {
    if (brandSearch && !formData.brandMarkups.find(b => b.brandName === brandSearch)) {
      setFormData(prev => ({
        ...prev,
        brandMarkups: [...prev.brandMarkups, {
          brandName: brandSearch,
          markupType: 'PERCENTAGE',
          markupValue: 0
        }]
      }))
      setBrandSearch('')
    }
  }

  const removeBrandMarkup = (index: number) => {
    setFormData(prev => ({
      ...prev,
      brandMarkups: prev.brandMarkups.filter((_, i) => i !== index)
    }))
  }

  const updateBrandMarkup = (index: number, field: keyof Omit<ProfileBrandMarkup, 'id' | 'brandName'>, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      brandMarkups: prev.brandMarkups.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const addCategoryMarkup = () => {
    if (categorySearch && !formData.categoryMarkups.find(c => c.categoryName === categorySearch)) {
      setFormData(prev => ({
        ...prev,
        categoryMarkups: [...prev.categoryMarkups, {
          categoryName: categorySearch,
          markupType: 'PERCENTAGE',
          markupValue: 0
        }]
      }))
      setCategorySearch('')
    }
  }

  const removeCategoryMarkup = (index: number) => {
    setFormData(prev => ({
      ...prev,
      categoryMarkups: prev.categoryMarkups.filter((_, i) => i !== index)
    }))
  }

  const updateCategoryMarkup = (index: number, field: keyof Omit<ProfileCategoryMarkup, 'id' | 'categoryName'>, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      categoryMarkups: prev.categoryMarkups.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const addSupplierMarkup = () => {
    if (supplierSearch && !formData.supplierMarkups.find(s => s.supplierName === supplierSearch)) {
      setFormData(prev => ({
        ...prev,
        supplierMarkups: [...prev.supplierMarkups, {
          supplierName: supplierSearch,
          markupType: 'PERCENTAGE',
          markupValue: 0
        }]
      }))
      setSupplierSearch('')
    }
  }

  const removeSupplierMarkup = (index: number) => {
    setFormData(prev => ({
      ...prev,
      supplierMarkups: prev.supplierMarkups.filter((_, i) => i !== index)
    }))
  }

  const updateSupplierMarkup = (index: number, field: keyof Omit<ProfileSupplierMarkup, 'id' | 'supplierName'>, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      supplierMarkups: prev.supplierMarkups.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const addExcludedBrand = () => {
    if (brandSearch && !formData.excludedBrands.includes(brandSearch)) {
      setFormData(prev => ({
        ...prev,
        excludedBrands: [...prev.excludedBrands, brandSearch]
      }))
      setBrandSearch('')
    }
  }

  const removeExcludedBrand = (brand: string) => {
    setFormData(prev => ({
      ...prev,
      excludedBrands: prev.excludedBrands.filter(b => b !== brand)
    }))
  }

  const addExcludedCategory = () => {
    if (categorySearch && !formData.excludedCategories.includes(categorySearch)) {
      setFormData(prev => ({
        ...prev,
        excludedCategories: [...prev.excludedCategories, categorySearch]
      }))
      setCategorySearch('')
    }
  }

  const removeExcludedCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      excludedCategories: prev.excludedCategories.filter(c => c !== category)
    }))
  }

  const updatePaymentType = (paymentType: ProfilePaymentType['paymentType'], isEnabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      paymentTypes: prev.paymentTypes.map(pt => 
        pt.paymentType === paymentType ? { ...pt, isEnabled } : pt
      )
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {profile ? 'Редактировать профиль' : 'Добавить профиль'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Код профиля</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Автоматически, если не указан"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Наименование профиля *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Комментарий</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="baseMarkup">Наценка % *</Label>
                <Input
                  id="baseMarkup"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.baseMarkup}
                  onChange={(e) => setFormData(prev => ({ ...prev, baseMarkup: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoSendInvoice"
                  checked={formData.autoSendInvoice}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoSendInvoice: !!checked }))}
                />
                <Label htmlFor="autoSendInvoice">Автоматически отправлять счет на оплату</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vinRequestModule"
                  checked={formData.vinRequestModule}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, vinRequestModule: !!checked }))}
                />
                <Label htmlFor="vinRequestModule">Модуль вин запросов</Label>
              </div>
            </CardContent>
          </Card>

          {/* Наценки от стоимости товара */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Наценки от стоимости товара
                <Button type="button" variant="outline" size="sm" onClick={addPriceRangeMarkup}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить наценку от стоимости товара
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.priceRangeMarkups.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Нет наценок от стоимости товара</p>
              ) : (
                <div className="space-y-4">
                  {formData.priceRangeMarkups.map((markup, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label>Цена от</Label>
                        <Input
                          type="number"
                          min="0"
                          value={markup.priceFrom}
                          onChange={(e) => updatePriceRangeMarkup(index, 'priceFrom', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Цена до</Label>
                        <Input
                          type="number"
                          min="0"
                          value={markup.priceTo}
                          onChange={(e) => updatePriceRangeMarkup(index, 'priceTo', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Тип наценки</Label>
                        <Select
                          value={markup.markupType}
                          onValueChange={(value) => updatePriceRangeMarkup(index, 'markupType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">Процент (%)</SelectItem>
                            <SelectItem value="FIXED_AMOUNT">Фикс надбавка (₽)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label>Значение</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={markup.markupValue}
                          onChange={(e) => updatePriceRangeMarkup(index, 'markupValue', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePriceRangeMarkup(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Наценки на бренды */}
          <Card>
            <CardHeader>
              <CardTitle>Наценка на бренд</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Поиск по брендам</Label>
                  <div className="flex gap-2">
                    <Input
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      placeholder="Введите название бренда"
                      list="brands-list"
                    />
                    <datalist id="brands-list">
                      {mockBrands.map(brand => (
                        <option key={brand} value={brand} />
                      ))}
                    </datalist>
                    <Button type="button" onClick={addBrandMarkup}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {formData.brandMarkups.length > 0 && (
                <div className="space-y-2">
                  {formData.brandMarkups.map((markup, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded">
                      <div className="flex-1">
                        <Badge variant="outline">{markup.brandName}</Badge>
                      </div>
                      <div className="flex-1">
                        <Select
                          value={markup.markupType}
                          onValueChange={(value) => updateBrandMarkup(index, 'markupType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">Процент (%)</SelectItem>
                            <SelectItem value="FIXED_AMOUNT">Фикс надбавка (₽)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={markup.markupValue}
                          onChange={(e) => updateBrandMarkup(index, 'markupValue', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeBrandMarkup(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Наценки на группы товаров */}
          <Card>
            <CardHeader>
              <CardTitle>Наценка на группу товаров</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Поиск по группам товаров</Label>
                  <div className="flex gap-2">
                    <Input
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Введите название группы товаров"
                      list="categories-list"
                    />
                    <datalist id="categories-list">
                      {mockCategories.map(category => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                    <Button type="button" onClick={addCategoryMarkup}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {formData.categoryMarkups.length > 0 && (
                <div className="space-y-2">
                  {formData.categoryMarkups.map((markup, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded">
                      <div className="flex-1">
                        <Badge variant="outline">{markup.categoryName}</Badge>
                      </div>
                      <div className="flex-1">
                        <Select
                          value={markup.markupType}
                          onValueChange={(value) => updateCategoryMarkup(index, 'markupType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">Процент (%)</SelectItem>
                            <SelectItem value="FIXED_AMOUNT">Фикс надбавка (₽)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={markup.markupValue}
                          onChange={(e) => updateCategoryMarkup(index, 'markupValue', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCategoryMarkup(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Наценки на поставщиков */}
          <Card>
            <CardHeader>
              <CardTitle>Наценки на поставщиков</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Поиск по поставщикам</Label>
                  <div className="flex gap-2">
                    <Input
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      placeholder="Введите название поставщика"
                      list="suppliers-list"
                    />
                    <datalist id="suppliers-list">
                      {mockSuppliers.map(supplier => (
                        <option key={supplier} value={supplier} />
                      ))}
                    </datalist>
                    <Button type="button" onClick={addSupplierMarkup}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {formData.supplierMarkups.length > 0 && (
                <div className="space-y-2">
                  {formData.supplierMarkups.map((markup, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded">
                      <div className="flex-1">
                        <Badge variant="outline">{markup.supplierName}</Badge>
                      </div>
                      <div className="flex-1">
                        <Select
                          value={markup.markupType}
                          onValueChange={(value) => updateSupplierMarkup(index, 'markupType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">Процент (%)</SelectItem>
                            <SelectItem value="FIXED_AMOUNT">Фикс надбавка (₽)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={markup.markupValue}
                          onChange={(e) => updateSupplierMarkup(index, 'markupValue', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSupplierMarkup(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Исключения из поиска */}
          <Card>
            <CardHeader>
              <CardTitle>Исключения из поиска</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Исключенные бренды */}
              <div>
                <Label>Бренды исключенные из поиска</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Поиск по брендам"
                    list="excluded-brands-list"
                  />
                  <datalist id="excluded-brands-list">
                    {mockBrands.map(brand => (
                      <option key={brand} value={brand} />
                    ))}
                  </datalist>
                  <Button type="button" onClick={addExcludedBrand}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.excludedBrands.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.excludedBrands.map((brand) => (
                      <Badge key={brand} variant="secondary" className="flex items-center gap-1">
                        {brand}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeExcludedBrand(brand)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Исключенные категории */}
              <div>
                <Label>Товарные группы исключенные из поиска</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Поиск по группам товаров"
                    list="excluded-categories-list"
                  />
                  <datalist id="excluded-categories-list">
                    {mockCategories.map(category => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                  <Button type="button" onClick={addExcludedCategory}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.excludedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.excludedCategories.map((category) => (
                      <Badge key={category} variant="secondary" className="flex items-center gap-1">
                        {category}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeExcludedCategory(category)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Типы платежей */}
          <Card>
            <CardHeader>
              <CardTitle>Типы платежей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.paymentTypes.map((paymentType) => (
                  <div key={paymentType.paymentType} className="flex items-center space-x-2">
                    <Checkbox
                      id={paymentType.paymentType}
                      checked={paymentType.isEnabled}
                      onCheckedChange={(checked) => updatePaymentType(paymentType.paymentType, !!checked)}
                    />
                    <Label htmlFor={paymentType.paymentType}>
                      {paymentTypeLabels[paymentType.paymentType]}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">
              {profile ? 'Сохранить изменения' : 'Создать профиль'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 