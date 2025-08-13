'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@apollo/client'
import { GET_PARTSINDEX_CATEGORIES } from '@/lib/graphql/queries'
import { Loader2, Upload, X, Image as ImageIcon, Folder, FolderOpen } from 'lucide-react'

interface PartsIndexCategory {
  id: string
  name: string
  image?: string
  groups?: PartsIndexGroup[]
}

interface PartsIndexGroup {
  id: string
  name: string
  image?: string
  subgroups?: PartsIndexGroup[]
}

interface NavigationCategory {
  id?: string
  partsIndexCatalogId: string
  partsIndexGroupId?: string
  icon?: string
  isHidden: boolean
  sortOrder: number
}

interface NavigationCategoryFormProps {
  category?: NavigationCategory | null
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading?: boolean
}

export default function NavigationCategoryForm({
  category,
  onSubmit,
  onCancel,
  isLoading = false
}: NavigationCategoryFormProps) {
  const [formData, setFormData] = useState({
    partsIndexCatalogId: '',
    partsIndexGroupId: '',
    icon: '',
    isHidden: false,
    sortOrder: 0
  })

  const [selectedCatalog, setSelectedCatalog] = useState<PartsIndexCategory | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<PartsIndexGroup | null>(null)

  // Загрузка категорий PartsIndex
  const { data: categoriesData, loading: categoriesLoading, error: categoriesError } = useQuery(
    GET_PARTSINDEX_CATEGORIES,
    {
      variables: { lang: 'ru' },
      errorPolicy: 'all'
    }
  )

  const categories = categoriesData?.partsIndexCategoriesWithGroups || []

  // Заполнение формы при редактировании
  useEffect(() => {
    if (category) {
      setFormData({
        partsIndexCatalogId: category.partsIndexCatalogId || '',
        partsIndexGroupId: category.partsIndexGroupId || '',
        icon: category.icon || '',
        isHidden: category.isHidden || false,
        sortOrder: category.sortOrder || 0
      })

      // Находим выбранный каталог и группу
      const catalog = categories.find(c => c.id === category.partsIndexCatalogId)
      if (catalog) {
        setSelectedCatalog(catalog)
        
        if (category.partsIndexGroupId && catalog.groups) {
          const group = findGroupById(catalog.groups, category.partsIndexGroupId)
          setSelectedGroup(group || null)
        }
      }
    }
  }, [category, categories])

  // Рекурсивный поиск группы по ID
  const findGroupById = (groups: PartsIndexGroup[], groupId: string): PartsIndexGroup | null => {
    for (const group of groups) {
      if (group.id === groupId) {
        return group
      }
      if (group.subgroups && group.subgroups.length > 0) {
        const found = findGroupById(group.subgroups, groupId)
        if (found) return found
      }
    }
    return null
  }

  // Получение всех групп из каталога (включая подгруппы)
  const getAllGroups = (groups: PartsIndexGroup[], level = 0): Array<PartsIndexGroup & { level: number }> => {
    const result: Array<PartsIndexGroup & { level: number }> = []
    
    groups.forEach(group => {
      result.push({ ...group, level })
      if (group.subgroups && group.subgroups.length > 0) {
        result.push(...getAllGroups(group.subgroups, level + 1))
      }
    })
    
    return result
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCatalogSelect = (catalogId: string) => {
    const catalog = categories.find(c => c.id === catalogId)
    setSelectedCatalog(catalog || null)
    setSelectedGroup(null)
    
    handleInputChange('partsIndexCatalogId', catalogId)
    handleInputChange('partsIndexGroupId', '')
  }

  const handleGroupSelect = (groupId: string) => {
    if (groupId === '__CATALOG_ROOT__') {
      setSelectedGroup(null)
      handleInputChange('partsIndexGroupId', '')
    } else if (selectedCatalog?.groups) {
      const group = findGroupById(selectedCatalog.groups, groupId)
      setSelectedGroup(group || null)
      handleInputChange('partsIndexGroupId', groupId)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        handleInputChange('icon', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.partsIndexCatalogId) {
      alert('Выберите каталог')
      return
    }

    onSubmit(formData)
  }

  const getDisplayName = () => {
    if (selectedGroup) {
      return `${selectedCatalog?.name} → ${selectedGroup.name}`
    }
    return selectedCatalog?.name || 'Выберите категорию'
  }

  if (categoriesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Загрузка категорий PartsIndex...</span>
        </CardContent>
      </Card>
    )
  }

  if (categoriesError) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">
            Ошибка загрузки категорий PartsIndex: {categoriesError.message}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {category ? 'Редактировать иконку категории' : 'Добавить иконку для категории'}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Выберите категорию из PartsIndex и загрузите иконку для отображения в навигации сайта
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Выбор каталога */}
          <div>
            <Label htmlFor="catalog">Каталог PartsIndex</Label>
            <Select value={formData.partsIndexCatalogId} onValueChange={handleCatalogSelect}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Выберите каталог из PartsIndex" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((catalog) => (
                  <SelectItem key={catalog.id} value={catalog.id}>
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-blue-600" />
                      {catalog.name}
                      {catalog.groups && (
                        <Badge variant="secondary" className="ml-2">
                          {catalog.groups.length} групп
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Выбор группы (если есть группы в каталоге) */}
          {selectedCatalog?.groups && selectedCatalog.groups.length > 0 && (
            <div>
              <Label htmlFor="group">Группа (необязательно)</Label>
              <p className="text-xs text-gray-500 mb-2">
                Оставьте пустым для добавления иконки всему каталогу
              </p>
              <Select value={formData.partsIndexGroupId || '__CATALOG_ROOT__'} onValueChange={handleGroupSelect}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выберите группу или оставьте пустым" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__CATALOG_ROOT__">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-gray-400" />
                                             Весь каталог &quot;{selectedCatalog.name}&quot;
                    </div>
                  </SelectItem>
                  {getAllGroups(selectedCatalog.groups).map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2" style={{ paddingLeft: `${group.level * 16}px` }}>
                        <Folder className="h-4 w-4 text-orange-600" />
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Предварительный просмотр выбранной категории */}
          {formData.partsIndexCatalogId && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="h-4 w-4 text-blue-600" />
                Выбранная категория:
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {getDisplayName()}
              </div>
            </div>
          )}

          {/* Загрузка иконки */}
          <div>
            <Label htmlFor="icon">Иконка категории</Label>
            <p className="text-xs text-gray-500 mb-2">
              Небольшая иконка для отображения в навигационном меню (рекомендуется 32x32 пикселя)
            </p>
            <div className="space-y-2">
              {formData.icon && (
                <div className="relative inline-block">
                  <img 
                    src={formData.icon} 
                    alt="Превью иконки" 
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    onClick={() => handleInputChange('icon', '')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="icon-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('icon-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить иконку
                </Button>
              </div>
            </div>
          </div>

          {/* Настройки отображения */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isHidden"
                checked={formData.isHidden}
                onCheckedChange={(checked) => handleInputChange('isHidden', checked)}
              />
              <Label htmlFor="isHidden" className="text-sm font-medium">
                Скрыть категорию в навигации
              </Label>
            </div>

            <div>
              <Label htmlFor="sortOrder">Порядок сортировки</Label>
              <Input
                type="number"
                id="sortOrder"
                value={formData.sortOrder}
                onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 0)}
                className="mt-1"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Меньшее число = выше в списке
              </p>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isLoading || !formData.partsIndexCatalogId}
              className="flex-1"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {category ? 'Сохранить изменения' : 'Добавить иконку'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 