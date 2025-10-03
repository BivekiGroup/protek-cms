"use client"

import React, { useMemo, useState, useEffect } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Package, Plus, Edit, Trash2, FolderOpen, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { useMutation } from '@apollo/client'
import { DELETE_PRODUCT, DELETE_PRODUCTS, UPDATE_PRODUCT_VISIBILITY, UPDATE_PRODUCTS_VISIBILITY, MOVE_PRODUCTS_TO_CATEGORY, UPDATE_PRODUCT_PRICE } from '@/lib/graphql/mutations'
import { CategorySelector } from './CategorySelector'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  article?: string
  brand?: string
  externalId?: string
  retailPrice?: number
  wholesalePrice?: number
  stock: number
  isVisible: boolean
  images: { url: string; alt?: string }[]
  categories: { id: string; name: string }[]
}

interface Category {
  id: string
  name: string
  slug: string
  level?: number
  parentId?: string | null
  _count?: {
    products: number
  }
}

interface ProductListProps {
  products: Product[]
  loading?: boolean
  onProductEdit: (product: Product) => void
  onProductCreated: () => void
  categories?: Category[]
}

type SortField = 'photo' | 'internalCode' | 'name' | 'category' | 'article' | 'stock' | 'wholesalePrice' | 'retailPrice' | 'isVisible'

export const ProductList = ({ products, loading, onProductEdit, onProductCreated, categories = [] }: ProductListProps) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const hasSelection = selectedProducts.length > 0
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: 'asc' | 'desc' } | null>(null)

  const [deleteProduct] = useMutation(DELETE_PRODUCT)
  const [deleteProducts] = useMutation(DELETE_PRODUCTS)
  const [updateProductVisibility] = useMutation(UPDATE_PRODUCT_VISIBILITY)
  const [updateProductsVisibility] = useMutation(UPDATE_PRODUCTS_VISIBILITY)
  const [moveProductsToCategory] = useMutation(MOVE_PRODUCTS_TO_CATEGORY)
  const [updateProductPrice] = useMutation(UPDATE_PRODUCT_PRICE)

  const [priceDrafts, setPriceDrafts] = useState<Record<string, { wholesale?: string; retail?: string }>>({})
  const [priceSaving, setPriceSaving] = useState<Record<string, boolean>>({})

  const frontendOrigin = useMemo(() => {
    const envOrigin = process.env.NEXT_PUBLIC_FRONTEND_ORIGIN
    if (envOrigin && typeof envOrigin === 'string') return envOrigin
    return process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://protekauto.ru'
  }, [])

  const buildFrontendProductUrl = (p: Product) => {
    const article = p.article?.trim()
    const brand = p.brand?.trim()
    const path = article && brand
      ? `/card?article=${encodeURIComponent(article)}&brand=${encodeURIComponent(brand)}`
      : '/card'
    return `${frontendOrigin}${path}`
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedProducts(products.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      const newSelected = [...selectedProducts, productId]
      setSelectedProducts(newSelected)
      // Проверяем, выбраны ли все товары
      if (newSelected.length === products.length) {
        setSelectAll(true)
      }
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId))
      setSelectAll(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Удалить товар?')) {
      try {
        await deleteProduct({ variables: { id: productId } })
        onProductCreated() // Обновляем список
      } catch (error) {
        console.error('Ошибка удаления товара:', error)
        alert('Не удалось удалить товар')
      }
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedProducts.length === 0) return
    
    if (confirm(`Удалить ${selectedProducts.length} товаров?`)) {
      setBulkLoading(true)
      try {
        const result = await deleteProducts({ variables: { ids: selectedProducts } })
        console.log('Результат удаления:', result)
        setSelectedProducts([])
        setSelectAll(false)
        onProductCreated() // Обновляем список
      } catch (error) {
        console.error('Ошибка удаления товаров:', error)
        alert('Не удалось удалить товары')
      } finally {
        setBulkLoading(false)
      }
    }
  }

  const handleToggleVisibility = async (productId: string, isVisible: boolean) => {
    try {
      await updateProductVisibility({ variables: { id: productId, isVisible } })
      onProductCreated() // Обновляем список
    } catch (error) {
      console.error('Ошибка изменения видимости:', error)
      alert('Не удалось изменить видимость товара')
    }
  }

  const handleToggleSelectedVisibility = async (isVisible: boolean) => {
    if (selectedProducts.length === 0) return
    
    setBulkLoading(true)
    try {
      const result = await updateProductsVisibility({ variables: { ids: selectedProducts, isVisible } })
      console.log('Результат изменения видимости:', result)
      setSelectedProducts([])
      setSelectAll(false)
      onProductCreated() // Обновляем список
    } catch (error) {
      console.error('Ошибка изменения видимости:', error)
      alert('Не удалось изменить видимость товаров')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleMoveToCategory = async (categoryId: string, categoryName: string) => {
    if (selectedProducts.length === 0) return
    
    setBulkLoading(true)
    try {
      const result = await moveProductsToCategory({ 
        variables: { 
          productIds: selectedProducts, 
          categoryId 
        } 
      })
      console.log('Результат перемещения товаров:', result)
      alert(`Успешно перемещено ${result.data?.moveProductsToCategory?.count || selectedProducts.length} товаров в категорию "${categoryName}"`)
      setSelectedProducts([])
      setSelectAll(false)
      onProductCreated() // Обновляем список
    } catch (error) {
      console.error('Ошибка перемещения товаров:', error)
      alert('Не удалось переместить товары в категорию')
    } finally {
      setBulkLoading(false)
    }
  }

  const isInitialLoading = loading && products.length === 0
  const isRefreshing = loading && products.length > 0

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev && prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      return { field, direction: 'asc' }
    })
  }

  const getSortValue = (product: Product, field: SortField): string | number => {
    switch (field) {
      case 'internalCode':
        return product.externalId?.toLowerCase() ?? product.id.toLowerCase()
      case 'photo':
        return product.images.length > 0 ? 1 : 0
      case 'name':
        return product.name?.toLowerCase() ?? ''
      case 'category':
        return product.categories.map(cat => cat.name).join(', ').toLowerCase()
      case 'article':
        return product.article?.toLowerCase() ?? ''
      case 'stock':
        return product.stock ?? 0
      case 'wholesalePrice':
        return product.wholesalePrice ?? 0
      case 'retailPrice':
        return product.retailPrice ?? 0
      case 'isVisible':
        return product.isVisible ? 1 : 0
      default:
        return ''
    }
  }

  const sortedProducts = useMemo(() => {
    if (!sortConfig) return products

    const sorted = [...products]
    sorted.sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.field)
      const bValue = getSortValue(b, sortConfig.field)

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aString = String(aValue)
      const bString = String(bValue)
      return sortConfig.direction === 'asc'
        ? aString.localeCompare(bString, 'ru')
        : bString.localeCompare(aString, 'ru')
    })
    return sorted
  }, [products, sortConfig])

  const renderSortIcon = (field: SortField) => {
    if (!sortConfig || sortConfig.field !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />
    }

    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />
  }

  const renderSortableHeader = (field: SortField, label: string) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-left font-medium text-gray-700 hover:text-gray-900 focus:outline-none"
    >
      <span>{label}</span>
      {renderSortIcon(field)}
    </button>
  )

  useEffect(() => {
    setPriceDrafts((prev) => {
      const next: Record<string, { wholesale?: string; retail?: string }> = {}
      for (const product of products) {
        if (prev[product.id]) {
          next[product.id] = prev[product.id]
        }
      }
      return next
    })
    setPriceSaving((prev) => {
      const next: Record<string, boolean> = {}
      for (const product of products) {
        if (prev[product.id]) {
          next[product.id] = prev[product.id]
        }
      }
      return next
    })
  }, [products])

  const getPriceValue = (product: Product, field: 'wholesale' | 'retail') => {
    const draft = priceDrafts[product.id]
    if (draft && draft[field] !== undefined) {
      const value = draft[field]
      return value ?? ''
    }

    const sourceValue = field === 'wholesale' ? product.wholesalePrice : product.retailPrice
    return sourceValue !== undefined && sourceValue !== null ? String(sourceValue) : ''
  }

  const handlePriceChange = (productId: string, field: 'wholesale' | 'retail', value: string) => {
    setPriceDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }))
  }

  const clearPriceDraft = (productId: string) => {
    setPriceDrafts((prev) => {
      if (!prev[productId]) {
        return prev
      }
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }

  const parsePriceValue = (value: string): number | null | typeof NaN => {
    const normalized = value.replace(/\s+/g, '').replace(',', '.').trim()
    if (normalized === '') {
      return null
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : NaN
  }

  const handlePriceSubmit = async (product: Product) => {
    if (priceSaving[product.id]) {
      return
    }

    const draft = priceDrafts[product.id]
    if (!draft || Object.keys(draft).length === 0) {
      return
    }

    const input: { wholesalePrice?: number | null; retailPrice?: number | null } = {}
    let hasChanges = false

    if (draft.wholesale !== undefined) {
      const parsedWholesale = parsePriceValue(draft.wholesale)
      if (Number.isNaN(parsedWholesale)) {
        toast.error('Некорректная оптовая цена')
        return
      }
      const currentWholesale = product.wholesalePrice ?? null
      if (parsedWholesale !== currentWholesale) {
        input.wholesalePrice = parsedWholesale
        hasChanges = true
      }
    }

    if (draft.retail !== undefined) {
      const parsedRetail = parsePriceValue(draft.retail)
      if (Number.isNaN(parsedRetail)) {
        toast.error('Некорректная цена на сайте')
        return
      }
      const currentRetail = product.retailPrice ?? null
      if (parsedRetail !== currentRetail) {
        input.retailPrice = parsedRetail
        hasChanges = true
      }
    }

    if (!hasChanges) {
      clearPriceDraft(product.id)
      return
    }

    setPriceSaving((prev) => ({ ...prev, [product.id]: true }))
    try {
      await updateProductPrice({
        variables: {
          id: product.id,
          input
        }
      })
      toast.success('Цены обновлены')
      clearPriceDraft(product.id)
      onProductCreated()
    } catch (error) {
      console.error('Ошибка обновления цен:', error)
      toast.error('Не удалось обновить цены')
    } finally {
      setPriceSaving((prev) => {
        const next = { ...prev }
        delete next[product.id]
        return next
      })
    }
  }

  const handlePriceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, product: Product) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handlePriceSubmit(product)
      event.currentTarget.blur()
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      clearPriceDraft(product.id)
      event.currentTarget.blur()
    }
  }

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Товары не найдены
        </h3>
        <p className="text-gray-500 mb-6">
          В данной категории пока нет товаров
        </p>
        <Button onClick={onProductCreated}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить товар
        </Button>
      </div>
    )
  }

  const gridTemplate = 'grid grid-cols-[30px_minmax(62px,95px)_minmax(52px,80px)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(68px,100px)_minmax(52px,80px)_minmax(62px,96px)_minmax(62px,96px)_minmax(48px,72px)_minmax(70px,100px)] items-center gap-1'

  return (
    <div className="relative">
      {isRefreshing ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : null}

      <div className="space-y-4">
        {/* Массовые действия */}
        <div className={`rounded-lg p-3.5 border transition-colors ${hasSelection ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">
              {hasSelection ? `Выбрано товаров: ${selectedProducts.length}` : 'Выберите товары для массовых действий'}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleSelectedVisibility(true)}
                disabled={!hasSelection || bulkLoading}
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Показать на сайте
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleSelectedVisibility(false)}
                disabled={!hasSelection || bulkLoading}
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Скрыть с сайта
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategorySelector(true)}
                disabled={!hasSelection || bulkLoading}
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FolderOpen className="w-4 h-4 mr-2" />}
                Переместить в категорию
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={!hasSelection || bulkLoading}
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Удалить выбранные
              </Button>
            </div>
          </div>
        </div>

        {/* Заголовок таблицы */}
        <div className="bg-gray-50 rounded-lg p-2.5 overflow-x-auto">
          <div className="min-w-full">
            <div className={`${gridTemplate} text-[9.5px] leading-[14px] font-medium text-gray-600 uppercase tracking-[0.05em] py-0.5`}>
              <div className="flex justify-center">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  className="h-3.5 w-3.5 [&_svg]:h-3 [&_svg]:w-3"
                />
              </div>
              <div className="whitespace-nowrap">{renderSortableHeader('internalCode', 'Внутр. код')}</div>
              <div className="whitespace-nowrap">{renderSortableHeader('photo', 'Фото')}</div>
              <div className="min-w-0 whitespace-nowrap">{renderSortableHeader('name', 'Название')}</div>
              <div className="min-w-0 whitespace-nowrap">{renderSortableHeader('category', 'Категория')}</div>
              <div className="min-w-0 whitespace-nowrap">{renderSortableHeader('article', 'Артикул')}</div>
              <div className="whitespace-nowrap">{renderSortableHeader('stock', 'Остаток')}</div>
              <div className="whitespace-nowrap">{renderSortableHeader('wholesalePrice', 'Цена опт')}</div>
              <div className="whitespace-nowrap">{renderSortableHeader('retailPrice', 'Цена сайт')}</div>
              <div className="whitespace-nowrap">{renderSortableHeader('isVisible', 'Сайт')}</div>
              <div className="flex justify-end pr-4 text-gray-400 whitespace-nowrap normal-case">Действия</div>
            </div>
          </div>
        </div>

        {/* Список товаров */}
        <div className="space-y-1.5 overflow-x-auto">
          {sortedProducts.map((product) => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-md p-1.5 hover:shadow-sm transition-shadow">
              <div className="w-full">
                <div className={`${gridTemplate} py-0.5 text-[10.5px] leading-tight`}>
                  {/* Чекбокс */}
                  <div className="flex justify-center">
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={(checked) => handleSelectProduct(product.id, Boolean(checked))}
                      className="h-3.5 w-3.5 [&_svg]:h-3 [&_svg]:w-3"
                    />
                  </div>

                  {/* Внутренний код */}
                  <div className="min-w-0">
                    <span className="block text-[10.5px] text-gray-600 truncate" title={product.externalId || product.id}>
                      {product.externalId || product.id}
                    </span>
                  </div>

                  {/* Фото */}
                  <div className="min-w-0">
                    {product.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        className="w-7 h-7 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-7 h-7 bg-gray-100 rounded border flex items-center justify-center">
                        <Package className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Название */}
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 text-[11px] truncate" title={product.name}>{product.name}</h3>
                  </div>

                  {/* Категория */}
                  <div className="min-w-0">
                    <span
                      className="block text-[10.5px] text-gray-700 truncate"
                      title={product.categories.length > 0 ? product.categories.map(cat => cat.name).join(', ') : undefined}
                    >
                      {product.categories.length > 0 ? product.categories.map(cat => cat.name).join(', ') : '—'}
                    </span>
                  </div>

                  {/* Артикул */}
                  <div className="min-w-0">
                    <span className="block text-[10.5px] text-gray-600 truncate" title={product.article || undefined}>
                      {product.article || '—'}
                    </span>
                  </div>

                  {/* Остаток */}
                  <div>
                    <span className={`text-[11px] ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stock} шт
                    </span>
                  </div>

                  {/* Цена опт */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={getPriceValue(product, 'wholesale')}
                        onChange={(event) => handlePriceChange(product.id, 'wholesale', event.target.value)}
                        onBlur={() => handlePriceSubmit(product)}
                        onKeyDown={(event) => handlePriceKeyDown(event, product)}
                        placeholder="—"
                        inputMode="decimal"
                        disabled={!!priceSaving[product.id]}
                        className="h-[22px] min-h-[22px] px-1.5 py-0 text-[10.5px]"
                      />
                      {priceSaving[product.id] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                      ) : null}
                    </div>
                  </div>

                  {/* Цена на сайте */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={getPriceValue(product, 'retail')}
                        onChange={(event) => handlePriceChange(product.id, 'retail', event.target.value)}
                        onBlur={() => handlePriceSubmit(product)}
                        onKeyDown={(event) => handlePriceKeyDown(event, product)}
                        placeholder="—"
                        inputMode="decimal"
                        disabled={!!priceSaving[product.id]}
                        className="h-[22px] min-h-[22px] px-1.5 py-0 text-[10.5px]"
                      />
                      {priceSaving[product.id] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                      ) : null}
                    </div>
                  </div>

                  {/* Показывать на сайте */}
                  <div>
                    <Switch
                      checked={product.isVisible}
                      onCheckedChange={(checked) => handleToggleVisibility(product.id, checked)}
                      size="sm"
                    />
                  </div>

                  {/* Действия */}
                  <div className="flex flex-nowrap items-center gap-1 justify-end pr-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onProductEdit(product)}
                    >
                      <Edit className="w-4 h-4" />
                      <span className="sr-only">Редактировать</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(buildFrontendProductUrl(product), '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="sr-only">Открыть на сайте</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sr-only">Удалить</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Модальное окно выбора категории */}
        <CategorySelector
          open={showCategorySelector}
          onOpenChange={setShowCategorySelector}
          categories={categories}
          onCategorySelect={handleMoveToCategory}
          title="Переместить товары в категорию"
          description={`Выберите категорию для перемещения ${selectedProducts.length} товаров`}
        />
      </div>
    </div>
  )
}
