"use client"

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Plus, 
  Search, 
  Upload,
  Download
} from 'lucide-react'
import { CategoryTree } from '@/components/catalog/CategoryTree'
import { ProductList } from '@/components/catalog/ProductList'
import { CategoryForm } from '@/components/catalog/CategoryForm'
import { ProductForm } from '@/components/catalog/ProductForm'
import { ImportProductsModal } from '@/components/catalog/ImportProductsModal'
import { Pagination } from '@/components/ui/pagination'
import { GET_CATEGORIES, GET_PRODUCTS, GET_PRODUCTS_COUNT } from '@/lib/graphql/queries'
import { EXPORT_PRODUCTS } from '@/lib/graphql/mutations'
import toast from 'react-hot-toast'



export default function CatalogPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(undefined)
  const [editingProduct, setEditingProduct] = useState(undefined)
  const [exportLoading, setExportLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const { data: categoriesData, loading: categoriesLoading, refetch: refetchCategories } = useQuery(GET_CATEGORIES)
  
  const { data: productsData, loading: productsLoading, refetch: refetchProducts } = useQuery(GET_PRODUCTS, {
    variables: {
      categoryId: selectedCategoryId,
      search: searchQuery || undefined,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage
    }
  })

  const { data: productsCountData, loading: countLoading } = useQuery(GET_PRODUCTS_COUNT, {
    variables: {
      categoryId: selectedCategoryId,
      search: searchQuery || undefined
    }
  })

  const [exportProducts] = useMutation(EXPORT_PRODUCTS)

  const categories = categoriesData?.categories || []
  const products = productsData?.products || []
  const totalProducts = productsCountData?.productsCount || 0
  const totalPages = Math.ceil(totalProducts / itemsPerPage)

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId)
    setCurrentPage(1) // Сбрасываем на первую страницу при смене категории
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // Сбрасываем на первую страницу при поиске
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleCategoryCreated = () => {
    setShowCategoryForm(false)
    setEditingCategory(undefined)
    refetchCategories()
  }

  const handleProductCreated = () => {
    setShowProductForm(false)
    setEditingProduct(undefined)
    refetchProducts()
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const result = await exportProducts({
        variables: {
          categoryId: selectedCategoryId,
          search: searchQuery || undefined
        }
      })
      
      if (result.data?.exportProducts) {
        // Открываем файл в новой вкладке для скачивания
        window.open(result.data.exportProducts.url, '_blank')
      }
    } catch (error) {
      console.error('Ошибка экспорта:', error)
      toast.error('Не удалось экспортировать товары')
    } finally {
      setExportLoading(false)
    }
  }

  const selectedCategory = selectedCategoryId 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? categories.find((cat: any) => cat.id === selectedCategoryId)
    : null

  return (
    <div className="flex h-full bg-gray-50">
      {/* Левое меню категорий */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Каталог товаров</h2>
          <Button
            onClick={() => setShowCategoryForm(true)}
            className="w-full"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить категорию
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <CategoryTree
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={handleCategorySelect}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onCategoryEdit={(category: any) => setEditingCategory(category)}
            onCategoryCreated={handleCategoryCreated}
            loading={categoriesLoading}
          />
        </div>
      </div>

      {/* Основная область */}
      <div className="flex-1 flex flex-col">
        {/* Заголовок и действия */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedCategory ? selectedCategory.name : 'Все товары'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {countLoading ? 'Загрузка...' : `Всего товаров: ${totalProducts}`}
                {totalPages > 1 && ` • Страница ${currentPage} из ${totalPages}`}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Импорт
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
                disabled={exportLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                {exportLoading ? 'Экспорт...' : 'Экспорт'}
              </Button>
              <Button 
                onClick={() => setShowProductForm(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить товар
              </Button>
            </div>
          </div>

          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Поиск товаров по названию, артикулу..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Список товаров */}
        <div className="flex-1 overflow-y-auto p-4">
          <ProductList
            products={products}
            loading={productsLoading}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onProductEdit={(product: any) => setEditingProduct(product)}
            onProductCreated={handleProductCreated}
            categories={categories}
          />
          
          {/* Пагинация и информация */}
          {totalProducts > 0 && (
            <div className="mt-6 space-y-4">
              {/* Информация о диапазоне */}
              <div className="text-sm text-gray-600 text-center">
                Показано {Math.min((currentPage - 1) * itemsPerPage + 1, totalProducts)}-{Math.min(currentPage * itemsPerPage, totalProducts)} из {totalProducts} товаров
              </div>
              
              {/* Пагинация */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Диалоги */}
      <Dialog open={showCategoryForm || !!editingCategory} onOpenChange={(open) => {
        if (!open) {
          setShowCategoryForm(false)
          setEditingCategory(undefined)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Редактировать категорию' : 'Создать категорию'}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            category={editingCategory}
            categories={categories}
            onSuccess={handleCategoryCreated}
            onCancel={() => {
              setShowCategoryForm(false)
              setEditingCategory(undefined)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showProductForm || !!editingProduct} onOpenChange={(open) => {
        if (!open) {
          setShowProductForm(false)
          setEditingProduct(undefined)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Редактировать товар' : 'Создать товар'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSuccess={handleProductCreated}
            onCancel={() => {
              setShowProductForm(false)
              setEditingProduct(undefined)
            }}
          />
        </DialogContent>
      </Dialog>

      <ImportProductsModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        categoryId={selectedCategoryId || undefined}
        onSuccess={handleProductCreated}
      />
    </div>
  )
} 