"use client"

import React, { useState } from 'react'
import { Loader2, Package, Plus, Edit, Trash2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { useMutation } from '@apollo/client'
import { DELETE_PRODUCT, DELETE_PRODUCTS, UPDATE_PRODUCT_VISIBILITY, UPDATE_PRODUCTS_VISIBILITY, MOVE_PRODUCTS_TO_CATEGORY } from '@/lib/graphql/mutations'
import { CategorySelector } from './CategorySelector'

interface Product {
  id: string
  name: string
  article?: string
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

export const ProductList = ({ products, loading, onProductEdit, onProductCreated, categories = [] }: ProductListProps) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)

  const [deleteProduct] = useMutation(DELETE_PRODUCT)
  const [deleteProducts] = useMutation(DELETE_PRODUCTS)
  const [updateProductVisibility] = useMutation(UPDATE_PRODUCT_VISIBILITY)
  const [updateProductsVisibility] = useMutation(UPDATE_PRODUCTS_VISIBILITY)
  const [moveProductsToCategory] = useMutation(MOVE_PRODUCTS_TO_CATEGORY)

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

  if (loading) {
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

  return (
    <div className="space-y-4">
      {/* Массовые действия */}
      {selectedProducts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              Выбрано товаров: {selectedProducts.length}
            </span>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleSelectedVisibility(true)}
                disabled={bulkLoading}
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Показать на сайте
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleSelectedVisibility(false)}
                disabled={bulkLoading}
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Скрыть с сайта
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategorySelector(true)}
                disabled={bulkLoading}
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FolderOpen className="w-4 h-4 mr-2" />}
                Переместить в категорию
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={bulkLoading}
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Удалить выбранные
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Заголовок таблицы */}
      <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-700">
            <div className="col-span-1">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
            </div>
            <div className="col-span-1">Фото</div>
            <div className="col-span-2">Название</div>
            <div className="col-span-1">Артикул</div>
            <div className="col-span-1">Остаток</div>
            <div className="col-span-1">Цена опт</div>
            <div className="col-span-1">Цена сайт</div>
            <div className="col-span-1">На сайте</div>
            <div className="col-span-3">Действия</div>
          </div>
        </div>
      </div>

      {/* Список товаров */}
      <div className="space-y-2 overflow-x-auto">
        {products.map((product) => (
          <div key={product.id} className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Чекбокс */}
                <div className="col-span-1">
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={(checked: boolean) => handleSelectProduct(product.id, checked)}
                  />
                </div>

                {/* Фото */}
                <div className="col-span-1">
                  {product.images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].alt || product.name}
                      className="w-12 h-12 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg border flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Название */}
                <div className="col-span-2">
                  <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                  {product.categories.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {product.categories.map(cat => cat.name).join(', ')}
                    </p>
                  )}
                </div>

                {/* Артикул */}
                <div className="col-span-1">
                  <span className="text-sm text-gray-600">{product.article || '—'}</span>
                </div>

                {/* Остаток */}
                <div className="col-span-1">
                  <span className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.stock} шт
                  </span>
                </div>

                {/* Цена опт */}
                <div className="col-span-1">
                  <span className="text-sm text-gray-900">
                    {product.wholesalePrice ? `${product.wholesalePrice} ₽` : '—'}
                  </span>
                </div>

                {/* Цена на сайте */}
                <div className="col-span-1">
                  <span className="text-sm text-gray-900">
                    {product.retailPrice ? `${product.retailPrice} ₽` : '—'}
                  </span>
                </div>

                              {/* Показывать на сайте */}
              <div className="col-span-1">
                <Switch
                  checked={product.isVisible}
                  onCheckedChange={(checked) => handleToggleVisibility(product.id, checked)}
                />
              </div>

                {/* Действия */}
                <div className="col-span-3 flex space-x-2 pr-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onProductEdit(product)}
                    className="flex-shrink-0"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Редактировать
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Удалить
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
  )
} 