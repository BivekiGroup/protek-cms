"use client"

import { useState, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { CREATE_CATEGORY, UPDATE_CATEGORY } from '@/lib/graphql/mutations'

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  seoTitle?: string
  seoDescription?: string
  image?: string
  isHidden: boolean
  includeSubcategoryProducts: boolean
  parentId?: string
}

interface CategoryFormProps {
  category?: Category
  categories?: Category[]
  parentCategoryId?: string
  onSuccess: () => void
  onCancel: () => void
}

export const CategoryForm = ({ 
  category, 
  categories = [], 
  parentCategoryId, 
  onSuccess, 
  onCancel 
}: CategoryFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    seoTitle: '',
    seoDescription: '',
    image: '',
    isHidden: false,
    includeSubcategoryProducts: false,
    parentId: parentCategoryId || 'root'
  })

  const [createCategory, { loading: creating }] = useMutation(CREATE_CATEGORY)
  const [updateCategory, { loading: updating }] = useMutation(UPDATE_CATEGORY)

  const loading = creating || updating
  const isEditing = !!category

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        seoTitle: category.seoTitle || '',
        seoDescription: category.seoDescription || '',
        image: category.image || '',
        isHidden: category.isHidden || false,
        includeSubcategoryProducts: category.includeSubcategoryProducts || false,
        parentId: category.parentId || 'root'
      })
    }
  }, [category])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Автоматически генерируем slug из названия
    if (field === 'name' && typeof value === 'string' && !isEditing) {
      const slug = value
        .toLowerCase()
        .replace(/[а-я]/g, (char) => {
          const map: { [key: string]: string } = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          }
          return map[char] || char
        })
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      
      setFormData(prev => ({ ...prev, slug }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Введите название категории')
      return
    }

    try {
      const input = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim() || undefined,
        seoTitle: formData.seoTitle.trim() || undefined,
        seoDescription: formData.seoDescription.trim() || undefined,
        image: formData.image.trim() || undefined,
        isHidden: formData.isHidden,
        includeSubcategoryProducts: formData.includeSubcategoryProducts,
        parentId: formData.parentId === 'root' ? undefined : formData.parentId || undefined
      }

      if (isEditing && category) {
        await updateCategory({
          variables: { id: category.id, input }
        })
      } else {
        await createCategory({
          variables: { input }
        })
      }

      onSuccess()
    } catch (error) {
      console.error('Ошибка сохранения категории:', error)
      alert('Не удалось сохранить категорию')
    }
  }

  // Фильтруем категории для выбора родительской (исключаем текущую и её потомков)
  const availableParentCategories = categories.filter(cat => {
    if (isEditing && category) {
      return cat.id !== category.id && !cat.parentId?.startsWith(category.id)
    }
    return true
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Название */}
        <div className="col-span-2">
          <Label htmlFor="name">Название *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Введите название категории"
            required
          />
        </div>

        {/* Slug */}
        <div className="col-span-2">
          <Label htmlFor="slug">Адрес (Slug)</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => handleInputChange('slug', e.target.value)}
            placeholder="Автоматически из названия"
          />
          <p className="text-xs text-gray-500 mt-1">
            Оставьте пустым для автоматической генерации
          </p>
        </div>

        {/* Родительская категория */}
        <div className="col-span-2">
          <Label htmlFor="parentId">Расположение</Label>
          <Select 
            value={formData.parentId} 
            onValueChange={(value) => handleInputChange('parentId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Корневая категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">Корневая категория</SelectItem>
              {availableParentCategories.map((cat) => (
                                 <SelectItem key={cat.id} value={cat.id}>
                   {'—'.repeat((cat as Category & { level?: number }).level || 0)} {cat.name}
                 </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Описание */}
      <div>
        <Label htmlFor="description">Описание</Label>
                 <Textarea
           id="description"
           value={formData.description}
           onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
           placeholder="Описание категории"
           rows={3}
         />
      </div>

      {/* SEO поля */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">SEO настройки</h3>
        
        <div>
          <Label htmlFor="seoTitle">Title (SEO)</Label>
          <Input
            id="seoTitle"
            value={formData.seoTitle}
            onChange={(e) => handleInputChange('seoTitle', e.target.value)}
            placeholder="Заголовок страницы"
          />
        </div>

        <div>
          <Label htmlFor="seoDescription">Мета-тег Description (SEO)</Label>
          <Textarea
            id="seoDescription"
            value={formData.seoDescription}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('seoDescription', e.target.value)}
            placeholder="Описание для поисковых систем"
            rows={2}
          />
        </div>
      </div>

      {/* Изображение */}
      <div>
        <Label htmlFor="image">Изображение</Label>
        <div className="space-y-2">
          {formData.image && (
            <div className="relative inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                src={formData.image} 
                alt="Превью" 
                className="w-32 h-32 object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2"
                onClick={() => handleInputChange('image', '')}
              >
                ×
              </Button>
            </div>
          )}
          <div className="flex space-x-2">
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  try {
                    const formData = new FormData()
                    formData.append('file', file)
                    formData.append('prefix', 'categories')

                    const response = await fetch('/api/upload', {
                      method: 'POST',
                      body: formData,
                    })

                    const result = await response.json()

                    if (!response.ok) {
                      throw new Error(result.error || 'Ошибка загрузки файла')
                    }

                    handleInputChange('image', result.data.url)
                  } catch (error) {
                    console.error('Ошибка загрузки изображения:', error)
                    alert(`Ошибка загрузки файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
                  }
                }
              }}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm">
              Загрузить
            </Button>
          </div>
          <Input
            placeholder="Или введите URL изображения"
            value={formData.image}
            onChange={(e) => handleInputChange('image', e.target.value)}
          />
        </div>
      </div>



      {/* Настройки */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Настройки</h3>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isHidden"
            checked={formData.isHidden}
            onCheckedChange={(checked: boolean) => handleInputChange('isHidden', !!checked)}
          />
          <Label htmlFor="isHidden" className="text-sm">
            Скрыть категорию на сайте
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeSubcategoryProducts"
            checked={formData.includeSubcategoryProducts}
            onCheckedChange={(checked: boolean) => handleInputChange('includeSubcategoryProducts', !!checked)}
          />
          <Label htmlFor="includeSubcategoryProducts" className="text-sm">
            Содержит все товары из подкатегорий
          </Label>
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Обновить' : 'Создать'}
        </Button>
      </div>
    </form>
  )
} 