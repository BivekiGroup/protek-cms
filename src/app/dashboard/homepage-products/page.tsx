"use client"

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { 
  Calendar,
  Plus, 
  Search, 
  Edit,
  Trash2,
  Package,
  Star,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { 
  GET_DAILY_PRODUCTS, 
  GET_BEST_PRICE_PRODUCTS, 
  GET_TOP_SALES_PRODUCTS, 
  GET_PRODUCTS 
} from '@/lib/graphql/queries'
import { 
  CREATE_DAILY_PRODUCT, 
  UPDATE_DAILY_PRODUCT, 
  DELETE_DAILY_PRODUCT,
  CREATE_BEST_PRICE_PRODUCT, 
  UPDATE_BEST_PRICE_PRODUCT, 
  DELETE_BEST_PRICE_PRODUCT,
  CREATE_TOP_SALES_PRODUCT,
  UPDATE_TOP_SALES_PRODUCT,
  DELETE_TOP_SALES_PRODUCT
} from '@/lib/graphql/mutations'
import toast from 'react-hot-toast'

// Типы данных
interface DailyProduct {
  id: string
  productId: string
  displayDate: string
  discount?: number
  isActive: boolean
  sortOrder: number
  product: {
    id: string
    name: string
    article?: string
    brand?: string
    retailPrice?: number
    images: { url: string; alt?: string }[]
  }
}

interface BestPriceProduct {
  id: string
  productId: string
  discount: number
  isActive: boolean
  sortOrder: number
  product: {
    id: string
    name: string
    article?: string
    brand?: string
    retailPrice?: number
    images: { url: string; alt?: string }[]
  }
}

interface TopSalesProduct {
  id: string
  productId: string
  isActive: boolean
  sortOrder: number
  product: {
    id: string
    name: string
    article?: string
    brand?: string
    retailPrice?: number
    images: { url: string; alt?: string }[]
  }
  createdAt: string
  updatedAt: string
}

interface Product {
  id: string
  name: string
  article?: string
  brand?: string
  retailPrice?: number
  images: { url: string; alt?: string }[]
}

export default function HomepageProductsPage() {
  // Состояния для товаров дня
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [showDailyProductSelector, setShowDailyProductSelector] = useState(false)
  const [editingDailyProduct, setEditingDailyProduct] = useState<DailyProduct | null>(null)
  const [dailyDiscount, setDailyDiscount] = useState<number>(0)

  // Состояния для лучших цен
  const [showBestPriceProductSelector, setShowBestPriceProductSelector] = useState(false)
  const [editingBestPriceProduct, setEditingBestPriceProduct] = useState<BestPriceProduct | null>(null)
  const [bestPriceDiscount, setBestPriceDiscount] = useState<number>(0)

  // Состояния для топ продаж
  const [showTopSalesProductSelector, setShowTopSalesProductSelector] = useState(false)
  const [editingTopSalesProduct, setEditingTopSalesProduct] = useState<TopSalesProduct | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Общие состояния
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('daily')

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Запросы данных
  const { data: dailyProductsData, loading: dailyProductsLoading, refetch: refetchDailyProducts } = useQuery(GET_DAILY_PRODUCTS, {
    variables: { displayDate: selectedDate }
  })

  const { data: bestPriceProductsData, loading: bestPriceProductsLoading, refetch: refetchBestPriceProducts } = useQuery(GET_BEST_PRICE_PRODUCTS)

  const { data: topSalesProductsData, loading: topSalesProductsLoading, refetch: refetchTopSalesProducts } = useQuery(GET_TOP_SALES_PRODUCTS)

  const { data: productsData, loading: productsLoading } = useQuery(GET_PRODUCTS, {
    variables: { 
      search: debouncedSearchQuery || undefined,
      limit: 100 
    },
    skip: !showDailyProductSelector && !showBestPriceProductSelector && !showTopSalesProductSelector
  })

  // Мутации для товаров дня
  const [createDailyProduct, { loading: creatingDaily }] = useMutation(CREATE_DAILY_PRODUCT)
  const [updateDailyProduct, { loading: updatingDaily }] = useMutation(UPDATE_DAILY_PRODUCT)
  const [deleteDailyProduct, { loading: deletingDaily }] = useMutation(DELETE_DAILY_PRODUCT)

  // Мутации для лучших цен
  const [createBestPriceProduct, { loading: creatingBestPrice }] = useMutation(CREATE_BEST_PRICE_PRODUCT)
  const [updateBestPriceProduct, { loading: updatingBestPrice }] = useMutation(UPDATE_BEST_PRICE_PRODUCT)
  const [deleteBestPriceProduct, { loading: deletingBestPrice }] = useMutation(DELETE_BEST_PRICE_PRODUCT)

  // Мутации для топ продаж
  const [createTopSalesProduct] = useMutation(CREATE_TOP_SALES_PRODUCT)
  const [updateTopSalesProduct] = useMutation(UPDATE_TOP_SALES_PRODUCT)
  const [deleteTopSalesProduct] = useMutation(DELETE_TOP_SALES_PRODUCT)

  // Данные
  const dailyProducts: DailyProduct[] = dailyProductsData?.dailyProducts || []
  const bestPriceProducts: BestPriceProduct[] = bestPriceProductsData?.bestPriceProducts || []
  const topSalesProducts: TopSalesProduct[] = topSalesProductsData?.topSalesProducts || []
  const products: Product[] = productsData?.products || []

  // Обработчики для товаров дня
  const handleAddDailyProduct = async (productId: string) => {
    try {
      await createDailyProduct({
        variables: {
          input: {
            productId,
            displayDate: selectedDate,
            discount: dailyDiscount || null,
            isActive: true,
            sortOrder: dailyProducts.length
          }
        }
      })
      
      toast.success('Товар добавлен!')
      setShowDailyProductSelector(false)
      setDailyDiscount(0)
      refetchDailyProducts()
    } catch (error) {
      console.error('Ошибка добавления товара:', error)
      toast.error('Не удалось добавить товар')
    }
  }

  const handleEditDailyProduct = (dailyProduct: DailyProduct) => {
    setEditingDailyProduct(dailyProduct)
    setDailyDiscount(dailyProduct.discount || 0)
  }

  const handleUpdateDailyProduct = async () => {
    if (!editingDailyProduct) return

    try {
      await updateDailyProduct({
        variables: {
          id: editingDailyProduct.id,
          input: {
            discount: dailyDiscount || null,
            isActive: editingDailyProduct.isActive
          }
        }
      })
      
      toast.success('Товар обновлен!')
      setEditingDailyProduct(null)
      setDailyDiscount(0)
      refetchDailyProducts()
    } catch (error) {
      console.error('Ошибка обновления товара:', error)
      toast.error('Не удалось обновить товар')
    }
  }

  const handleDeleteDailyProduct = async (id: string) => {
    if (!confirm('Удалить товар из списка товаров дня?')) return

    try {
      await deleteDailyProduct({
        variables: { id }
      })
      
      toast.success('Товар удален!')
      refetchDailyProducts()
    } catch (error) {
      console.error('Ошибка удаления товара:', error)
      toast.error('Не удалось удалить товар')
    }
  }

  // Обработчики для лучших цен
  const handleAddBestPriceProduct = async (productId: string) => {
    try {
      await createBestPriceProduct({
        variables: {
          input: {
            productId,
            discount: bestPriceDiscount || 0,
            isActive: true,
            sortOrder: bestPriceProducts.length
          }
        }
      })
      
      toast.success('Товар добавлен в лучшие цены!')
      setShowBestPriceProductSelector(false)
      setBestPriceDiscount(0)
      refetchBestPriceProducts()
    } catch (error) {
      console.error('Ошибка добавления товара:', error)
      toast.error('Не удалось добавить товар')
    }
  }

  const handleEditBestPriceProduct = (bestPriceProduct: BestPriceProduct) => {
    setEditingBestPriceProduct(bestPriceProduct)
    setBestPriceDiscount(bestPriceProduct.discount || 0)
  }

  const handleUpdateBestPriceProduct = async () => {
    if (!editingBestPriceProduct) return

    try {
      await updateBestPriceProduct({
        variables: {
          id: editingBestPriceProduct.id,
          input: {
            discount: bestPriceDiscount || 0,
            isActive: editingBestPriceProduct.isActive
          }
        }
      })
      
      toast.success('Товар обновлен!')
      setEditingBestPriceProduct(null)
      setBestPriceDiscount(0)
      refetchBestPriceProducts()
    } catch (error) {
      console.error('Ошибка обновления товара:', error)
      toast.error('Не удалось обновить товар')
    }
  }

  const handleDeleteBestPriceProduct = async (id: string) => {
    if (!confirm('Удалить товар из списка товаров с лучшей ценой?')) return

    try {
      await deleteBestPriceProduct({
        variables: { id }
      })
      
      toast.success('Товар удален!')
      refetchBestPriceProducts()
    } catch (error) {
      console.error('Ошибка удаления товара:', error)
      toast.error('Не удалось удалить товар')
    }
  }

  // Обработчики для топ продаж
  const handleAddTopSalesProduct = () => {
    if (!selectedProduct) {
      toast.error('Выберите товар')
      return
    }

    createTopSalesProduct({
      variables: {
        input: {
          productId: selectedProduct.id,
          isActive: true,
          sortOrder: 0
        }
      },
      onCompleted: () => {
        toast.success('Товар добавлен в топ продаж')
        refetchTopSalesProducts()
        setShowTopSalesProductSelector(false)
        setSelectedProduct(null)
      },
      onError: (error) => {
        toast.error(`Ошибка: ${error.message}`)
      }
    })
  }

  const handleDeleteTopSalesProduct = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот товар из топ продаж?')) {
      deleteTopSalesProduct({
        variables: { id },
        onCompleted: () => {
          toast.success('Товар удален из топ продаж')
          refetchTopSalesProducts()
        },
        onError: (error) => {
          toast.error(`Ошибка: ${error.message}`)
        }
      })
    }
  }

  const handleToggleTopSalesActive = (item: TopSalesProduct) => {
    updateTopSalesProduct({
      variables: {
        id: item.id,
        input: {
          isActive: !item.isActive,
          sortOrder: item.sortOrder
        }
      },
      onCompleted: () => {
        refetchTopSalesProducts()
      }
    })
  }

  const handleTopSalesSortOrderChange = (item: TopSalesProduct, direction: 'up' | 'down') => {
    const newSortOrder = direction === 'up' ? item.sortOrder - 1 : item.sortOrder + 1
    updateTopSalesProduct({
      variables: {
        id: item.id,
        input: {
          isActive: item.isActive,
          sortOrder: Math.max(0, newSortOrder)
        }
      },
      onCompleted: () => {
        refetchTopSalesProducts()
      }
    })
  }

  // Утилиты
  const formatPrice = (price?: number) => {
    if (!price) return '—'
    return `${price.toLocaleString('ru-RU')} ₽`
  }

  const calculateDiscountedPrice = (price?: number, discount?: number) => {
    if (!price || !discount) return price
    return price * (1 - discount / 100)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление товарами главной страницы</h1>
        <p className="text-gray-600">Управление товарами дня, лучшими ценами и топ продажами на главной странице сайта</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily" className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Товары дня
          </TabsTrigger>
          <TabsTrigger value="best-price" className="flex items-center">
            <Star className="w-4 h-4 mr-2" />
            Лучшие цены
          </TabsTrigger>
          <TabsTrigger value="top-sales" className="flex items-center">
            <Package className="w-4 h-4 mr-2" />
            Топ продаж
          </TabsTrigger>
        </TabsList>

        {/* Товары дня */}
        <TabsContent value="daily" className="space-y-6">
          {/* Выбор даты */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Выбор даты показа
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div>
                  <Label htmlFor="date">Дата показа товаров</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="pt-6">
                  <p className="text-sm text-gray-500">
                    Выбранная дата: {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: ru })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Товары дня */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Товары дня
                </CardTitle>
                <Button
                  onClick={() => setShowDailyProductSelector(true)}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить товар
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dailyProductsLoading ? (
                <div className="text-center py-8 text-gray-500">Загрузка товаров...</div>
              ) : dailyProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Товары дня не добавлены на выбранную дату
                </div>
              ) : (
                <div className="space-y-4">
                  {dailyProducts.map((dailyProduct) => (
                    <div key={dailyProduct.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Изображение товара */}
                        <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                          {dailyProduct.product.images?.[0]?.url ? (
                            <img 
                              src={dailyProduct.product.images[0].url} 
                              alt={dailyProduct.product.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        {/* Информация о товаре */}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{dailyProduct.product.name}</h3>
                          <div className="text-sm text-gray-500 space-y-1">
                            {dailyProduct.product.article && (
                              <p>Артикул: {dailyProduct.product.article}</p>
                            )}
                            {dailyProduct.product.brand && (
                              <p>Бренд: {dailyProduct.product.brand}</p>
                            )}
                            <div className="flex items-center space-x-2">
                              <span>Цена: {formatPrice(dailyProduct.product.retailPrice)}</span>
                              {dailyProduct.discount && (
                                <span className="text-green-600 font-medium">
                                  Со скидкой {dailyProduct.discount}%: {formatPrice(calculateDiscountedPrice(dailyProduct.product.retailPrice, dailyProduct.discount))}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Скидка */}
                        {dailyProduct.discount && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            -{dailyProduct.discount}%
                          </Badge>
                        )}
                      </div>

                      {/* Действия */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDailyProduct(dailyProduct)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDailyProduct(dailyProduct.id)}
                          disabled={deletingDaily}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Лучшие цены */}
        <TabsContent value="best-price" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-500" />
                  Товары с лучшей ценой
                </CardTitle>
                <Button
                  onClick={() => setShowBestPriceProductSelector(true)}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить товар
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bestPriceProductsLoading ? (
                <div className="text-center py-8 text-gray-500">Загрузка товаров...</div>
              ) : bestPriceProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Товары с лучшей ценой не добавлены
                </div>
              ) : (
                <div className="space-y-4">
                  {bestPriceProducts.map((bestPriceProduct) => (
                    <div key={bestPriceProduct.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Изображение товара */}
                        <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                          {bestPriceProduct.product.images?.[0]?.url ? (
                            <img 
                              src={bestPriceProduct.product.images[0].url} 
                              alt={bestPriceProduct.product.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        {/* Информация о товаре */}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{bestPriceProduct.product.name}</h3>
                          <div className="text-sm text-gray-500 space-y-1">
                            {bestPriceProduct.product.article && (
                              <p>Артикул: {bestPriceProduct.product.article}</p>
                            )}
                            {bestPriceProduct.product.brand && (
                              <p>Бренд: {bestPriceProduct.product.brand}</p>
                            )}
                            <div className="flex items-center space-x-2">
                              <span>Цена: {formatPrice(bestPriceProduct.product.retailPrice)}</span>
                              <span className="text-green-600 font-medium">
                                Со скидкой {bestPriceProduct.discount}%: {formatPrice(calculateDiscountedPrice(bestPriceProduct.product.retailPrice, bestPriceProduct.discount))}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Скидка */}
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          -{bestPriceProduct.discount}%
                        </Badge>
                      </div>

                      {/* Действия */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditBestPriceProduct(bestPriceProduct)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBestPriceProduct(bestPriceProduct.id)}
                          disabled={deletingBestPrice}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Топ продаж */}
        <TabsContent value="top-sales" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Топ продаж
                </CardTitle>
                <Button
                  onClick={() => setShowTopSalesProductSelector(true)}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить товар
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {topSalesProductsLoading ? (
                <div className="text-center py-8 text-gray-500">Загрузка товаров...</div>
              ) : topSalesProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Товары в топ продаж не добавлены
                </div>
              ) : (
                <div className="space-y-4">
                  {topSalesProducts.map((topSalesProduct) => (
                    <div key={topSalesProduct.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Изображение товара */}
                        <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                          {topSalesProduct.product.images?.[0]?.url ? (
                            <img 
                              src={topSalesProduct.product.images[0].url} 
                              alt={topSalesProduct.product.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        {/* Информация о товаре */}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{topSalesProduct.product.name}</h3>
                          <div className="text-sm text-gray-500 space-y-1">
                            {topSalesProduct.product.article && (
                              <p>Артикул: {topSalesProduct.product.article}</p>
                            )}
                            {topSalesProduct.product.brand && (
                              <p>Бренд: {topSalesProduct.product.brand}</p>
                            )}
                            <p>Цена: {formatPrice(topSalesProduct.product.retailPrice)}</p>
                          </div>
                        </div>

                        {/* Статус */}
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={topSalesProduct.isActive}
                            onCheckedChange={() => handleToggleTopSalesActive(topSalesProduct)}
                          />
                          <span className="text-sm text-gray-500">
                            {topSalesProduct.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                        </div>
                      </div>

                      {/* Действия */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTopSalesSortOrderChange(topSalesProduct, 'up')}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTopSalesSortOrderChange(topSalesProduct, 'down')}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTopSalesProduct(topSalesProduct.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Диалог добавления товара дня */}
      <Dialog open={showDailyProductSelector} onOpenChange={setShowDailyProductSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить товар дня</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Поиск товаров */}
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Скидка */}
            <div>
              <Label htmlFor="daily-discount">Скидка (%)</Label>
              <Input
                id="daily-discount"
                type="number"
                min="0"
                max="100"
                value={dailyDiscount}
                onChange={(e) => setDailyDiscount(Number(e.target.value))}
                placeholder="Размер скидки"
              />
            </div>

            {/* Список товаров */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {productsLoading ? (
                <div className="text-center py-4 text-gray-500">Загрузка товаров...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-4 text-gray-500">Товары не найдены</div>
              ) : (
                products.map((product) => (
                  <div key={product.id} className="border rounded p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                        {product.images?.[0]?.url ? (
                          <img 
                            src={product.images[0].url} 
                            alt={product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <div className="text-sm text-gray-500">
                          {product.article && <span>Артикул: {product.article} | </span>}
                          {product.brand && <span>Бренд: {product.brand} | </span>}
                          <span>Цена: {formatPrice(product.retailPrice)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAddDailyProduct(product.id)}
                      disabled={creatingDaily}
                      size="sm"
                    >
                      Добавить
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления товара с лучшей ценой */}
      <Dialog open={showBestPriceProductSelector} onOpenChange={setShowBestPriceProductSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить товар с лучшей ценой</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Поиск товаров */}
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Скидка */}
            <div>
              <Label htmlFor="best-price-discount">Скидка (%)</Label>
              <Input
                id="best-price-discount"
                type="number"
                min="0"
                max="100"
                value={bestPriceDiscount}
                onChange={(e) => setBestPriceDiscount(Number(e.target.value))}
                placeholder="Размер скидки (необязательно)"
              />
            </div>

            {/* Список товаров */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {productsLoading ? (
                <div className="text-center py-4 text-gray-500">Загрузка товаров...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-4 text-gray-500">Товары не найдены</div>
              ) : (
                products.map((product) => (
                  <div key={product.id} className="border rounded p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                        {product.images?.[0]?.url ? (
                          <img 
                            src={product.images[0].url} 
                            alt={product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <div className="text-sm text-gray-500">
                          {product.article && <span>Артикул: {product.article} | </span>}
                          {product.brand && <span>Бренд: {product.brand} | </span>}
                          <span>Цена: {formatPrice(product.retailPrice)}</span>
                          {bestPriceDiscount > 0 && (
                            <span className="text-green-600 ml-2">
                              Со скидкой: {formatPrice(calculateDiscountedPrice(product.retailPrice, bestPriceDiscount))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAddBestPriceProduct(product.id)}
                      disabled={creatingBestPrice}
                      size="sm"
                    >
                      Добавить
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления товара в топ продаж */}
      <Dialog open={showTopSalesProductSelector} onOpenChange={setShowTopSalesProductSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить товар в топ продаж</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Поиск товаров */}
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Список товаров */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {productsLoading ? (
                <div className="text-center py-4 text-gray-500">Загрузка товаров...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-4 text-gray-500">Товары не найдены</div>
              ) : (
                products.map((product) => (
                  <div 
                    key={product.id} 
                    className={`border rounded p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      selectedProduct?.id === product.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                        {product.images?.[0]?.url ? (
                          <img 
                            src={product.images[0].url} 
                            alt={product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <div className="text-sm text-gray-500">
                          {product.article && <span>Артикул: {product.article} | </span>}
                          {product.brand && <span>Бренд: {product.brand} | </span>}
                          <span>Цена: {formatPrice(product.retailPrice)}</span>
                        </div>
                      </div>
                    </div>
                    {selectedProduct?.id === product.id && (
                      <Badge variant="secondary">Выбран</Badge>
                    )}
                  </div>
                ))
              )}
            </div>

            {selectedProduct && (
              <div className="pt-4 border-t">
                <Button onClick={handleAddTopSalesProduct} className="w-full">
                  Добавить выбранный товар в топ продаж
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования товара дня */}
      <Dialog open={!!editingDailyProduct} onOpenChange={() => setEditingDailyProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать товар дня</DialogTitle>
          </DialogHeader>
          
          {editingDailyProduct && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{editingDailyProduct.product.name}</h3>
                <p className="text-sm text-gray-500">
                  {editingDailyProduct.product.article && `Артикул: ${editingDailyProduct.product.article} | `}
                  {editingDailyProduct.product.brand && `Бренд: ${editingDailyProduct.product.brand} | `}
                  Цена: {formatPrice(editingDailyProduct.product.retailPrice)}
                </p>
              </div>

              <div>
                <Label htmlFor="edit-daily-discount">Скидка (%)</Label>
                <Input
                  id="edit-daily-discount"
                  type="number"
                  min="0"
                  max="100"
                  value={dailyDiscount}
                  onChange={(e) => setDailyDiscount(Number(e.target.value))}
                  placeholder="Размер скидки"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingDailyProduct(null)}>
                  Отмена
                </Button>
                <Button onClick={handleUpdateDailyProduct} disabled={updatingDaily}>
                  Сохранить
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования товара с лучшей ценой */}
      <Dialog open={!!editingBestPriceProduct} onOpenChange={() => setEditingBestPriceProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать товар с лучшей ценой</DialogTitle>
          </DialogHeader>
          
          {editingBestPriceProduct && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{editingBestPriceProduct.product.name}</h3>
                <p className="text-sm text-gray-500">
                  {editingBestPriceProduct.product.article && `Артикул: ${editingBestPriceProduct.product.article} | `}
                  {editingBestPriceProduct.product.brand && `Бренд: ${editingBestPriceProduct.product.brand} | `}
                  Цена: {formatPrice(editingBestPriceProduct.product.retailPrice)}
                </p>
              </div>

                             <div>
                 <Label htmlFor="edit-best-price-discount">Скидка (%)</Label>
                 <Input
                   id="edit-best-price-discount"
                   type="number"
                   min="0"
                   max="100"
                   value={bestPriceDiscount}
                   onChange={(e) => setBestPriceDiscount(Number(e.target.value))}
                   placeholder="Размер скидки (необязательно)"
                 />
               </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingBestPriceProduct(null)}>
                  Отмена
                </Button>
                <Button onClick={handleUpdateBestPriceProduct} disabled={updatingBestPrice}>
                  Сохранить
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 