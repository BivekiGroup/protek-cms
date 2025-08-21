'use client'

import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Upload, Plus, X, Trash2, Edit } from 'lucide-react'
import { CREATE_PRODUCT, UPDATE_PRODUCT } from '@/lib/graphql/mutations'
import { GET_CHARACTERISTICS, GET_PRODUCTS, GET_PRODUCT_HISTORY } from '@/lib/graphql/queries'

interface Product {
  id: string
  name: string
  slug: string
  article?: string
  description?: string
  videoUrl?: string
  wholesalePrice?: number
  retailPrice?: number
  weight?: number
  dimensions?: string
  unit: string
  isVisible: boolean
  applyDiscounts: boolean
  stock: number
  brand?: string
  categories: Category[]
  images: ProductImage[]
  characteristics: ProductCharacteristic[]
  options: ProductOption[]
  relatedProducts: Product[]
  accessoryProducts: Product[]
  createdAt?: string
  updatedAt?: string
}

interface Category {
  id: string
  name: string
  slug: string
  isHidden: boolean
  children: Category[]
  level: number
  _count?: { products: number }
}

interface ProductImage {
  id?: string
  url: string
  alt?: string
  order: number
}

interface ProductCharacteristic {
  id?: string
  name: string
  value: string
}

interface ProductOption {
  id: string
  name: string
  type: 'SINGLE' | 'MULTIPLE'
  values: OptionValue[]
}

interface OptionValue {
  id: string
  value: string
  price: number
}

interface ProductFormProps {
  product?: Product
  categories: Category[]
  selectedCategoryId?: string | null
  onSuccess: () => void
  onCancel: () => void
}

const UNITS = [
  'шт', 'кг', 'г', 'л', 'мл', 'м', 'см', 'мм', 'м²', 'м³', 'комплект', 'упаковка', 'пара',
  'литр', 'метр', 'километр', 'тонна', 'грамм', 'миллиметр', 'сантиметр', 'квадратный метр',
  'кубический метр', 'набор', 'коробка', 'бутылка', 'банка', 'рулон', 'лист'
]

// Функция для красивого форматирования изменений
const formatChanges = (changesJson: string) => {
  try {
    const changes = JSON.parse(changesJson)
    const formattedChanges: string[] = []
    
    // Форматируем каждое поле
    Object.entries(changes).forEach(([key, value]) => {
      switch (key) {
        case 'name':
          formattedChanges.push(`Название: "${value}"`)
          break
        case 'article':
          formattedChanges.push(`Артикул: "${value}"`)
          break
        case 'description':
          formattedChanges.push(`Описание: "${value}"`)
          break
        case 'wholesalePrice':
          formattedChanges.push(`Оптовая цена: ${value} ₽`)
          break
        case 'retailPrice':
          formattedChanges.push(`Розничная цена: ${value} ₽`)
          break
        case 'stock':
          formattedChanges.push(`Остаток: ${value} шт`)
          break
        case 'isVisible':
          formattedChanges.push(`Видимость: ${value ? 'Видимый' : 'Скрытый'}`)
          break
        case 'categories':
          if (Array.isArray(value)) {
            formattedChanges.push(`Категории: ${value.length} шт`)
          }
          break
        case 'images':
          if (typeof value === 'number') {
            formattedChanges.push(`Изображения: ${value} шт`)
          }
          break
        case 'characteristics':
          if (typeof value === 'number') {
            formattedChanges.push(`Характеристики: ${value} шт`)
          }
          break
        case 'options':
          if (typeof value === 'number') {
            formattedChanges.push(`Опции: ${value} шт`)
          }
          break
        case 'weight':
          formattedChanges.push(`Вес: ${value} кг`)
          break
        case 'dimensions':
          formattedChanges.push(`Размеры: ${value}`)
          break
        case 'unit':
          formattedChanges.push(`Единица: ${value}`)
          break
        case 'applyDiscounts':
          formattedChanges.push(`Применять скидки: ${value ? 'Да' : 'Нет'}`)
          break
        case 'videoUrl':
          formattedChanges.push(`Видео: ${value ? 'Добавлено' : 'Удалено'}`)
          break
        default:
          formattedChanges.push(`${key}: ${value}`)
      }
    })
    
    return formattedChanges
  } catch {
    return ['Ошибка форматирования изменений']
  }
}

export const ProductForm = ({ 
  product,
  categories = [],
  selectedCategoryId,
  onSuccess, 
  onCancel 
}: ProductFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    article: '',
    description: '',
    videoUrl: '',
    wholesalePrice: '',
    retailPrice: '',
    weight: '',
    dimensionLength: '',
    dimensionWidth: '',
    dimensionHeight: '',
    unit: 'шт',
    isVisible: true,
    applyDiscounts: true,
    stock: '0',
    brand: '',
    categoryIds: selectedCategoryId ? [selectedCategoryId] : [] as string[]
  })

  const [images, setImages] = useState<ProductImage[]>([])
  const [characteristics, setCharacteristics] = useState<ProductCharacteristic[]>([])
  const [options, setOptions] = useState<ProductOption[]>([])
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [accessoryProducts, setAccessoryProducts] = useState<Product[]>([])
  
  // Модальные окна
  const [showCharacteristicForm, setShowCharacteristicForm] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)

  const [showRelatedProductsSelector, setShowRelatedProductsSelector] = useState(false)
  const [showAccessoryProductsSelector, setShowAccessoryProductsSelector] = useState(false)
  const [showOptionForm, setShowOptionForm] = useState(false)
  const [showChangeLog, setShowChangeLog] = useState(false)
  
  // Формы
  const [newCharacteristic, setNewCharacteristic] = useState({ name: '', value: '' })
  const [newOption, setNewOption] = useState({
    name: '',
    type: 'SINGLE' as 'SINGLE' | 'MULTIPLE',
    values: [{ id: '', value: '', price: 0 }]
  })
  const [editingCharacteristic, setEditingCharacteristic] = useState<number | null>(null)
  const [editingOption, setEditingOption] = useState<string | null>(null)

  const [createProduct, { loading: creating }] = useMutation(CREATE_PRODUCT)
  const [updateProduct, { loading: updating }] = useMutation(UPDATE_PRODUCT)
  const { data: characteristicsData } = useQuery(GET_CHARACTERISTICS)
  const { data: productsData } = useQuery(GET_PRODUCTS, {
    variables: { limit: 1000 }
  })
  const { data: historyData } = useQuery(GET_PRODUCT_HISTORY, {
    variables: { productId: product?.id },
    skip: !product?.id
  })

  const loading = creating || updating
  const isEditing = !!product
  const availableCharacteristics = characteristicsData?.characteristics || []
  const allProducts = productsData?.products || []

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        article: product.article || '',
        description: product.description || '',
        videoUrl: product.videoUrl || '',
        wholesalePrice: product.wholesalePrice?.toString() || '',
        retailPrice: product.retailPrice?.toString() || '',
        weight: product.weight?.toString() || '',
        dimensionLength: product.dimensions?.split('x')[0] || '',
        dimensionWidth: product.dimensions?.split('x')[1] || '',
        dimensionHeight: product.dimensions?.split('x')[2] || '',
        unit: product.unit || 'шт',
        isVisible: product.isVisible ?? true,
        applyDiscounts: product.applyDiscounts ?? true,
        stock: product.stock?.toString() || '0',
        brand: product.brand || '',
        categoryIds: product.categories?.map(cat => cat.id) || []
      })
      // Очищаем изображения от лишних полей
      setImages((product.images || []).map(img => ({
        url: img.url,
        alt: img.alt || '',
        order: img.order
      })))
      
      // Преобразуем характеристики в нужный формат
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCharacteristics((product.characteristics || []).map((char: any) => ({
        name: char.characteristic?.name || char.name || '',
        value: char.value || ''
      })))
      
      // Преобразуем опции в нужный формат
      // Группируем опции по названию, так как из GraphQL приходят отдельные записи для каждого значения
      console.log('Исходные опции из GraphQL:', product.options)
      
      const optionsMap = new Map<string, ProductOption>()
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(product.options || []).forEach((productOption: any) => {
        console.log('Обрабатываем productOption:', productOption)
        const optionName = productOption.option?.name || ''
        const optionType = productOption.option?.type || 'SINGLE'
        const optionValue = productOption.optionValue
        
        if (!optionsMap.has(optionName)) {
          optionsMap.set(optionName, {
            id: productOption.option?.id || productOption.id,
            name: optionName,
            type: optionType,
            values: []
          })
        }
        
        const option = optionsMap.get(optionName)!
        if (optionValue) {
          option.values.push({
            id: optionValue.id,
            value: optionValue.value,
            price: optionValue.price || 0
          })
        }
      })
      
      const finalOptions = Array.from(optionsMap.values())
      console.log('Финальные опции после группировки:', finalOptions)
      setOptions(finalOptions)
      setRelatedProducts(product.relatedProducts || [])
      setAccessoryProducts(product.accessoryProducts || [])
    }
  }, [product])

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Автогенерация slug
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

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('prefix', 'products')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Ошибка загрузки файла')
        }

        setImages(prev => [...prev, { 
          url: result.data.url, 
          alt: file.name, 
          order: prev.length + i 
        }])
      } catch (error) {
        console.error('Ошибка загрузки изображения:', error)
        // Показываем ошибку пользователю
        alert(`Ошибка загрузки файла ${file.name}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
      }
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index).map((img, i) => ({ ...img, order: i })))
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    setImages(prev => {
      const newImages = [...prev]
      const [moved] = newImages.splice(fromIndex, 1)
      newImages.splice(toIndex, 0, moved)
      return newImages.map((img, i) => ({ ...img, order: i }))
    })
  }

  const addCharacteristic = () => {
    if (newCharacteristic.name.trim() && newCharacteristic.value.trim()) {
      if (editingCharacteristic !== null) {
        setCharacteristics(prev => prev.map((char, index) => 
          index === editingCharacteristic ? { ...newCharacteristic } : char
        ))
        setEditingCharacteristic(null)
      } else {
        setCharacteristics(prev => [...prev, { ...newCharacteristic }])
      }
      setNewCharacteristic({ name: '', value: '' })
      setShowCharacteristicForm(false)
    }
  }

  const editCharacteristic = (index: number) => {
    setNewCharacteristic(characteristics[index])
    setEditingCharacteristic(index)
    setShowCharacteristicForm(true)
  }

  const removeCharacteristic = (index: number) => {
    setCharacteristics(prev => prev.filter((_, i) => i !== index))
  }

  const addOption = () => {
    if (!newOption.name.trim()) {
      alert('Введите название опции')
      return
    }

    if (newOption.values.some(v => !v.value.trim())) {
      alert('Заполните все значения опции')
      return
    }

    const option: ProductOption = {
      id: editingOption || Date.now().toString(),
      name: newOption.name.trim(),
      type: newOption.type,
      values: newOption.values.map((v, index) => ({
        id: v.id || `${Date.now()}-${index}`,
        value: v.value.trim(),
        price: v.price || 0
      }))
    }

    if (editingOption) {
      setOptions(prev => prev.map(opt => opt.id === editingOption ? option : opt))
    } else {
      setOptions(prev => [...prev, option])
    }

    setNewOption({
      name: '',
      type: 'SINGLE',
      values: [{ id: '', value: '', price: 0 }]
    })
    setEditingOption(null)
    setShowOptionForm(false)
  }

  const removeOption = (optionId: string) => {
    setOptions(prev => prev.filter(opt => opt.id !== optionId))
  }

  const editOption = (optionId: string) => {
    const option = options.find(opt => opt.id === optionId)
    if (option) {
      setNewOption({
        name: option.name,
        type: option.type,
        values: option.values.map(v => ({ ...v }))
      })
      setEditingOption(optionId)
      setShowOptionForm(true)
    }
  }

  const addOptionValue = () => {
    setNewOption(prev => ({
      ...prev,
      values: [...prev.values, { id: '', value: '', price: 0 }]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Введите название товара')
      return
    }

    if (!formData.brand.trim()) {
      alert('Введите бренд товара')
      return
    }

    try {
      const dimensions = [formData.dimensionLength, formData.dimensionWidth, formData.dimensionHeight]
        .filter(d => d.trim())
        .join('x') || undefined

      const input = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        article: formData.article.trim() || undefined,
        description: formData.description.trim() || undefined,
        videoUrl: formData.videoUrl.trim() || undefined,
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : undefined,
        retailPrice: formData.retailPrice ? parseFloat(formData.retailPrice) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        dimensions,
        unit: formData.unit,
        isVisible: formData.isVisible,
        applyDiscounts: formData.applyDiscounts,
        stock: parseInt(formData.stock) || 0,
        brand: formData.brand.trim(),
        categoryIds: formData.categoryIds
      }

      // Очищаем данные изображений от лишних полей
      const cleanImages = images.map(img => ({
        url: img.url,
        alt: img.alt || '',
        order: img.order
      }))

      // Очищаем данные опций
      const optionsData = options.map(option => ({
        name: option.name,
        type: option.type,
        values: option.values.map(value => ({
          value: value.value,
          price: value.price
        }))
      }))

      console.log('Отправляемые данные опций:', optionsData)

      // Очищаем данные характеристик
      const cleanCharacteristics = characteristics.map(char => ({ 
        name: char.name, 
        value: char.value 
      }))

      if (isEditing && product) {
        console.log('Отправляем updateProduct с переменными:', {
          id: product.id, 
          input,
          images: cleanImages,
          characteristics: cleanCharacteristics,
          options: optionsData
        })
        
        const result = await updateProduct({
          variables: { 
            id: product.id, 
            input,
            images: cleanImages,
            characteristics: cleanCharacteristics,
            options: optionsData
          }
        })
        
        console.log('Результат updateProduct:', result)
        console.log('Опции в результате:', result.data?.updateProduct?.options)
      } else {
        console.log('Отправляем createProduct с переменными:', {
          input,
          images: cleanImages,
          characteristics: cleanCharacteristics,
          options: optionsData
        })
        
        const result = await createProduct({
          variables: { 
            input,
            images: cleanImages,
            characteristics: cleanCharacteristics,
            options: optionsData
          }
        })
        
        console.log('Результат createProduct:', result)
      }

      onSuccess()
    } catch (error) {
      console.error('Ошибка сохранения товара:', error)
      alert('Не удалось сохранить товар')
    }
  }

  const selectedCategories = categories.filter(cat => formData.categoryIds.includes(cat.id))

  return (
    <div>
      <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-6">
      {/* Левая часть - основная информация */}
      <div className="col-span-2 space-y-6">
        {/* Изображения */}
        <div>
          <Label>Изображения</Label>
          <div className="space-y-4">
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={image.url} 
                      alt={image.alt || 'Изображение товара'}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => moveImage(index, Math.max(0, index - 1))}
                        disabled={index === 0}
                        className="p-1 h-6 w-6"
                      >
                        ←
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => moveImage(index, Math.min(images.length - 1, index + 1))}
                        disabled={index === images.length - 1}
                        className="p-1 h-6 w-6"
                      >
                        →
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => removeImage(index)}
                        className="p-1 h-6 w-6"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
                id="image-upload"
              />
              <Label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {images.length > 0 ? 'Загрузить ещё' : 'Загрузить изображения'}
                </p>
                <p className="text-xs text-gray-400">Поддерживается множественная загрузка</p>
              </Label>
            </div>
          </div>
        </div>

        {/* Видео */}
        <div>
          <Label htmlFor="videoUrl">Видео (ссылка)</Label>
          <Input
            id="videoUrl"
            value={formData.videoUrl}
            onChange={(e) => handleInputChange('videoUrl', e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>

        {/* Основная информация */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3">
            <Label htmlFor="name">Наименование *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Введите название товара"
              required
            />
          </div>

          <div>
            <Label htmlFor="article">Артикул</Label>
            <Input
              id="article"
              value={formData.article}
              onChange={(e) => handleInputChange('article', e.target.value)}
              placeholder="Артикул товара"
            />
          </div>

          <div>
            <Label htmlFor="brand">Бренд *</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => handleInputChange('brand', e.target.value)}
              placeholder="Введите бренд товара"
              required
              style={{ cursor: 'pointer' }}
            />
          </div>

          <div>
            <Label htmlFor="slug">Адрес (Slug)</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              placeholder="Автоматически из названия"
            />
          </div>
        </div>

        {/* Описание */}
        <div>
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Описание товара"
            rows={4}
          />
        </div>

        {/* Цены и характеристики */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="wholesalePrice">Цена опт</Label>
            <Input
              id="wholesalePrice"
              type="number"
              step="0.01"
              value={formData.wholesalePrice}
              onChange={(e) => handleInputChange('wholesalePrice', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="retailPrice">Цена на сайте</Label>
            <Input
              id="retailPrice"
              type="number"
              step="0.01"
              value={formData.retailPrice}
              onChange={(e) => handleInputChange('retailPrice', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="weight">Вес (кг)</Label>
            <Input
              id="weight"
              type="number"
              step="0.001"
              value={formData.weight}
              onChange={(e) => handleInputChange('weight', e.target.value)}
              placeholder="0.000"
            />
          </div>
        </div>

        {/* Габариты ДхШхВ */}
        <div>
          <Label>Габариты ДхШхВ, см</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={formData.dimensionLength}
              onChange={(e) => handleInputChange('dimensionLength', e.target.value)}
              placeholder="Длина"
              type="number"
              step="0.1"
            />
            <Input
              value={formData.dimensionWidth}
              onChange={(e) => handleInputChange('dimensionWidth', e.target.value)}
              placeholder="Ширина"
              type="number"
              step="0.1"
            />
            <Input
              value={formData.dimensionHeight}
              onChange={(e) => handleInputChange('dimensionHeight', e.target.value)}
              placeholder="Высота"
              type="number"
              step="0.1"
            />
          </div>
        </div>

        {/* Опции товара */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Опции товара</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setShowOptionForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить опцию
            </Button>
          </div>
          {options.length > 0 ? (
            <div className="space-y-3">
              {options.map((option) => (
                <div key={option.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">{option.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({option.type === 'SINGLE' ? 'Одиночный' : 'Множественный'} выбор)
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => editOption(option.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeOption(option.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {option.values.map((value) => (
                      <div key={value.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                        <span>{value.value}</span>
                        {value.price > 0 && <span className="text-green-600">+{value.price}₽</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 p-4 border rounded-lg text-center">
              Опции не добавлены
              <div className="text-xs mt-1">Опции позволяют покупателям выбирать варианты товара (цвет, размер и т.д.)</div>
            </div>
          )}
        </div>

        {/* Характеристики */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Характеристики</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setShowCharacteristicForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </div>

          {characteristics.length > 0 ? (
            <div className="space-y-2">
              {characteristics.map((char, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{char.name}</div>
                    <div className="text-sm text-gray-600">{char.value}</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editCharacteristic(index)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeCharacteristic(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 p-4 border rounded-lg text-center">
              Характеристики не добавлены
              <div className="text-xs mt-1">Характеристики помогают покупателям узнать детали товара</div>
            </div>
          )}

          {showCharacteristicForm && (
            <div className="border rounded-lg p-4 space-y-3 mt-3">
              <div>
                <Label>Найти или создать характеристику</Label>
                <Input
                  value={newCharacteristic.name}
                  onChange={(e) => setNewCharacteristic(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Название характеристики"
                  list="characteristics-list"
                />
                <datalist id="characteristics-list">
                  {availableCharacteristics.map((char: { id: string; name: string }) => (
                    <option key={char.id} value={char.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>Значение</Label>
                <Input
                  value={newCharacteristic.value}
                  onChange={(e) => setNewCharacteristic(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Значение характеристики"
                />
              </div>
              <div className="flex space-x-2">
                <Button type="button" size="sm" onClick={addCharacteristic}>
                  Сохранить
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowCharacteristicForm(false)
                    setNewCharacteristic({ name: '', value: '' })
                    setEditingCharacteristic(null)
                  }}
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Правая часть - настройки */}
      <div className="space-y-6">
        {/* Показывать на сайте */}
        <div className="flex items-center justify-between">
          <Label htmlFor="isVisible">Показывать на сайте</Label>
          <Switch
            id="isVisible"
            checked={formData.isVisible}
            onCheckedChange={(checked) => handleInputChange('isVisible', checked)}
          />
        </div>

        {/* Категории */}
        <div>
          <Label>Категории</Label>
          <div className="space-y-2">
            {selectedCategories.length > 0 ? (
              <div className="border rounded-lg p-3 space-y-1">
                {selectedCategories.map(category => (
                  <div key={category.id} className="text-sm">
                    {'—'.repeat(category.level || 0)} {category.name}
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-lg p-3 text-sm text-gray-500">
                Категории не выбраны
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCategorySelector(!showCategorySelector)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Редактировать
            </Button>
            
            {showCategorySelector && (
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={formData.categoryIds.includes(category.id)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          handleInputChange('categoryIds', [...formData.categoryIds, category.id])
                        } else {
                          handleInputChange('categoryIds', formData.categoryIds.filter(id => id !== category.id))
                        }
                      }}
                    />
                    <Label htmlFor={`category-${category.id}`} className="text-sm">
                      {'—'.repeat(category.level || 0)} {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Единицы измерения */}
        <div>
          <Label htmlFor="unit">Единицы измерения</Label>
          <Select value={formData.unit} onValueChange={(value) => handleInputChange('unit', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map(unit => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Остаток */}
        <div>
          <Label htmlFor="stock">Остаток</Label>
          <Input
            id="stock"
            type="number"
            value={formData.stock}
            onChange={(e) => handleInputChange('stock', e.target.value)}
            placeholder="0"
          />
        </div>

        {/* Применять скидки */}
        <div className="flex items-center justify-between">
          <Label htmlFor="applyDiscounts">Применять скидки</Label>
          <Checkbox
            id="applyDiscounts"
            checked={formData.applyDiscounts}
            onCheckedChange={(checked: boolean) => handleInputChange('applyDiscounts', checked)}
          />
        </div>

        {/* Информация */}
        {isEditing && (
          <div className="border rounded-lg p-3">
            <Label className="text-sm font-medium">Информация</Label>
            <p className="text-xs text-gray-500 mt-1">
              Последнее изменение: {new Date().toLocaleDateString()}
            </p>
            <Button 
              type="button" 
              variant="link" 
              size="sm" 
              className="p-0 h-auto"
              onClick={() => setShowChangeLog(true)}
            >
              Показать лог изменений
            </Button>
          </div>
        )}

        {/* Связанные товары */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Связанные товары</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setShowRelatedProductsSelector(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </div>
          {relatedProducts.length > 0 ? (
            <div className="space-y-1">
              {relatedProducts.map(product => (
                <div key={product.id} className="text-sm p-2 border rounded flex justify-between items-center">
                  <span>{product.name}</span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setRelatedProducts(prev => prev.filter(p => p.id !== product.id))}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Связанные товары не добавлены</div>
          )}
        </div>

        {/* Сопутствующие товары */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Сопутствующие товары</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setShowAccessoryProductsSelector(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </div>
          {accessoryProducts.length > 0 ? (
            <div className="space-y-1">
              {accessoryProducts.map(product => (
                <div key={product.id} className="text-sm p-2 border rounded flex justify-between items-center">
                  <span>{product.name}</span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setAccessoryProducts(prev => prev.filter(p => p.id !== product.id))}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Сопутствующие товары не добавлены</div>
          )}
        </div>

        {/* Кнопки */}
        <div className="space-y-2 pt-4 border-t">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Сохранение...' : (isEditing ? 'Обновить товар' : 'Создать товар')}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onCancel} disabled={loading}>
            Отмена
          </Button>
        </div>
      </div>
    </form>

    {/* Модальные окна */}

    {/* Создание новой опции */}
    <Dialog open={showOptionForm} onOpenChange={setShowOptionForm}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingOption ? 'Редактировать опцию' : 'Создать опцию'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Название опции</Label>
            <Input
              value={newOption.name}
              onChange={(e) => setNewOption(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Например: Цвет, Размер, Материал"
            />
            <p className="text-xs text-gray-500 mt-1">
              Название опции, которую будут видеть покупатели
            </p>
          </div>
          
          <div>
            <Label>Тип выбора</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="single"
                  name="optionType"
                  checked={newOption.type === 'SINGLE'}
                  onChange={() => setNewOption(prev => ({ ...prev, type: 'SINGLE' }))}
                />
                <Label htmlFor="single" className="text-sm">Одиночный выбор (радиокнопки)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="multiple"
                  name="optionType"
                  checked={newOption.type === 'MULTIPLE'}
                  onChange={() => setNewOption(prev => ({ ...prev, type: 'MULTIPLE' }))}
                />
                <Label htmlFor="multiple" className="text-sm">Множественный выбор (чекбоксы)</Label>
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Варианты опции</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOptionValue}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить вариант
              </Button>
            </div>
            
            {newOption.values.length === 0 ? (
              <div className="text-center p-4 border rounded-lg text-gray-500">
                <p className="text-sm">Нет вариантов</p>
                <p className="text-xs mt-1">Добавьте варианты для этой опции</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {newOption.values.map((value, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                    <Input
                      placeholder="Название варианта"
                      value={value.value}
                      onChange={(e) => {
                        const newValues = [...newOption.values]
                        newValues[index].value = e.target.value
                        setNewOption(prev => ({ ...prev, values: newValues }))
                      }}
                      className="flex-1"
                    />
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">+</span>
                      <Input
                        placeholder="0"
                        type="number"
                        step="0.01"
                        value={value.price}
                        onChange={(e) => {
                          const newValues = [...newOption.values]
                          newValues[index].price = parseFloat(e.target.value) || 0
                          setNewOption(prev => ({ ...prev, values: newValues }))
                        }}
                        className="w-20"
                      />
                      <span className="text-xs text-gray-500">₽</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newValues = newOption.values.filter((_, i) => i !== index)
                        setNewOption(prev => ({ ...prev, values: newValues }))
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Укажите дополнительную стоимость для каждого варианта (0 = без доплаты)
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              setShowOptionForm(false)
              setEditingOption(null)
              setNewOption({
                name: '',
                type: 'SINGLE',
                values: [{ id: '', value: '', price: 0 }]
              })
            }}>
              Отмена
            </Button>
            <Button onClick={addOption}>
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Выбор связанных товаров */}
    <Dialog open={showRelatedProductsSelector} onOpenChange={setShowRelatedProductsSelector}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Выбрать связанные товары</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Input placeholder="Поиск по артикулу..." className="flex-1" />
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Фильтр по категории" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {'—'.repeat(category.level || 0)} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            <div className="grid grid-cols-6 gap-4 p-3 bg-gray-50 text-sm font-medium sticky top-0">
              <div>Выбрать</div>
              <div>Фото</div>
              <div>Название</div>
              <div>Артикул</div>
              <div>Цена</div>
              <div>Остаток</div>
            </div>
            
            {allProducts.filter((p: Product) => p.id !== product?.id).map((prod: Product) => (
              <div key={prod.id} className="grid grid-cols-6 gap-4 p-3 border-t items-center">
                <Checkbox
                  checked={relatedProducts.some(rp => rp.id === prod.id)}
                  onCheckedChange={(checked: boolean) => {
                    if (checked) {
                      setRelatedProducts(prev => [...prev, prod])
                    } else {
                      setRelatedProducts(prev => prev.filter(rp => rp.id !== prod.id))
                    }
                  }}
                />
                <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                  {prod.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={prod.images[0].url} alt={prod.name} className="w-full h-full object-cover rounded" />
                  ) : (
                    <span className="text-xs text-gray-400">Нет фото</span>
                  )}
                </div>
                <div className="text-sm">{prod.name}</div>
                <div className="text-sm text-gray-600">{prod.article || '—'}</div>
                <div className="text-sm">{prod.retailPrice ? `${prod.retailPrice} ₽` : '—'}</div>
                <div className="text-sm">{prod.stock} шт</div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowRelatedProductsSelector(false)}>
              Отмена
            </Button>
            <Button onClick={() => setShowRelatedProductsSelector(false)}>
              Добавить выбранные
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Выбор сопутствующих товаров */}
    <Dialog open={showAccessoryProductsSelector} onOpenChange={setShowAccessoryProductsSelector}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Выбрать сопутствующие товары</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Input placeholder="Поиск по артикулу..." className="flex-1" />
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Фильтр по категории" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {'—'.repeat(category.level || 0)} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            <div className="grid grid-cols-6 gap-4 p-3 bg-gray-50 text-sm font-medium sticky top-0">
              <div>Выбрать</div>
              <div>Фото</div>
              <div>Название</div>
              <div>Артикул</div>
              <div>Цена</div>
              <div>Остаток</div>
            </div>
            
            {allProducts.filter((p: Product) => p.id !== product?.id).map((prod: Product) => (
              <div key={prod.id} className="grid grid-cols-6 gap-4 p-3 border-t items-center">
                <Checkbox
                  checked={accessoryProducts.some(ap => ap.id === prod.id)}
                  onCheckedChange={(checked: boolean) => {
                    if (checked) {
                      setAccessoryProducts(prev => [...prev, prod])
                    } else {
                      setAccessoryProducts(prev => prev.filter(ap => ap.id !== prod.id))
                    }
                  }}
                />
                <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                  {prod.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={prod.images[0].url} alt={prod.name} className="w-full h-full object-cover rounded" />
                  ) : (
                    <span className="text-xs text-gray-400">Нет фото</span>
                  )}
                </div>
                <div className="text-sm">{prod.name}</div>
                <div className="text-sm text-gray-600">{prod.article || '—'}</div>
                <div className="text-sm">{prod.retailPrice ? `${prod.retailPrice} ₽` : '—'}</div>
                <div className="text-sm">{prod.stock} шт</div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAccessoryProductsSelector(false)}>
              Отмена
            </Button>
            <Button onClick={() => setShowAccessoryProductsSelector(false)}>
              Добавить выбранные
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Лог изменений */}
    <Dialog open={showChangeLog} onOpenChange={setShowChangeLog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Лог изменений товара</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {historyData?.productHistory?.length > 0 ? (
            historyData.productHistory.map((entry: { id: string; action: string; createdAt: string; user?: { firstName: string; lastName: string }; changes?: string }) => (
              <div key={entry.id} className="border rounded-lg p-4 bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="text-sm font-medium text-gray-900">
                      {entry.action === 'CREATE' ? 'Создание товара' : 
                       entry.action === 'UPDATE' ? 'Изменение товара' : 
                       entry.action === 'DELETE' ? 'Удаление товара' : entry.action}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-3">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-400">Автор:</span>
                    <span className="font-medium">
                      {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Система'}
                    </span>
                  </div>
                </div>

                {entry.changes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-700 mb-2">Изменения:</div>
                    <div className="space-y-1">
                      {formatChanges(entry.changes).map((change, index) => (
                        <div key={index} className="text-xs text-gray-600 flex items-start">
                          <span className="text-gray-400 mr-2">•</span>
                          <span className="break-words">{change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-sm text-gray-500 py-8">
              {isEditing ? (
                <div>
                  <div className="border rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium">Создание товара</div>
                      <div className="text-xs text-gray-500">
                        {product?.createdAt ? new Date(product.createdAt).toLocaleString() : new Date().toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Товар создан
                    </div>
                  </div>
                  <div>История изменений пуста</div>
                </div>
              ) : (
                'История будет доступна после создания товара'
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </div>
  )
} 