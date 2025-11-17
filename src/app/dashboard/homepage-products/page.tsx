"use client"

import { useState, useEffect } from 'react'
import NextImage from 'next/image'
import { useQuery, useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  ChevronDown,
  Sparkles
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { 
  GET_DAILY_PRODUCTS, 
  GET_BEST_PRICE_PRODUCTS, 
  GET_TOP_SALES_PRODUCTS, 
  GET_NEW_ARRIVAL_PRODUCTS,
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
  DELETE_TOP_SALES_PRODUCT,
  CREATE_NEW_ARRIVAL_PRODUCT,
  UPDATE_NEW_ARRIVAL_PRODUCT,
  DELETE_NEW_ARRIVAL_PRODUCT
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

interface NewArrivalProduct {
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Состояния для новых поступлений
  const [showNewArrivalProductSelector, setShowNewArrivalProductSelector] = useState(false)
  const [selectedNewArrivalProduct, setSelectedNewArrivalProduct] = useState<Product | null>(null)

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

  const { data: newArrivalProductsData, loading: newArrivalProductsLoading, refetch: refetchNewArrivalProducts } = useQuery(GET_NEW_ARRIVAL_PRODUCTS)

  const { data: productsData, loading: productsLoading } = useQuery(GET_PRODUCTS, {
    variables: { 
      search: debouncedSearchQuery || undefined,
      limit: 100 
    },
    skip: !showDailyProductSelector && !showBestPriceProductSelector && !showTopSalesProductSelector && !showNewArrivalProductSelector
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

  // Мутации для новых поступлений
  const [createNewArrivalProduct] = useMutation(CREATE_NEW_ARRIVAL_PRODUCT)
  const [updateNewArrivalProduct] = useMutation(UPDATE_NEW_ARRIVAL_PRODUCT)
  const [deleteNewArrivalProduct] = useMutation(DELETE_NEW_ARRIVAL_PRODUCT)

  // Данные
  const dailyProducts: DailyProduct[] = dailyProductsData?.dailyProducts || []
  const bestPriceProducts: BestPriceProduct[] = bestPriceProductsData?.bestPriceProducts || []
  const topSalesProducts: TopSalesProduct[] = topSalesProductsData?.topSalesProducts || []
  const newArrivalProducts: NewArrivalProduct[] = newArrivalProductsData?.newArrivalProducts || []
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

  // Обработчики для новых поступлений
  const handleAddNewArrivalProduct = () => {
    if (!selectedNewArrivalProduct) {
      toast.error('Выберите товар')
      return
    }

    createNewArrivalProduct({
      variables: {
        input: {
          productId: selectedNewArrivalProduct.id,
          isActive: true,
          sortOrder: newArrivalProducts.length
        }
      },
      onCompleted: () => {
        toast.success('Товар добавлен в новые поступления')
        refetchNewArrivalProducts()
        setShowNewArrivalProductSelector(false)
        setSelectedNewArrivalProduct(null)
      },
      onError: (error) => {
        toast.error(`Ошибка: ${error.message}`)
      }
    })
  }

  const handleDeleteNewArrivalProduct = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот товар из новых поступлений?')) {
      deleteNewArrivalProduct({
        variables: { id },
        onCompleted: () => {
          toast.success('Товар удален из новых поступлений')
          refetchNewArrivalProducts()
        },
        onError: (error) => {
          toast.error(`Ошибка: ${error.message}`)
        }
      })
    }
  }

  const handleToggleNewArrivalActive = (item: NewArrivalProduct) => {
    updateNewArrivalProduct({
      variables: {
        id: item.id,
        input: {
          isActive: !item.isActive,
          sortOrder: item.sortOrder
        }
      },
      onCompleted: () => {
        refetchNewArrivalProducts()
      }
    })
  }

  const handleNewArrivalSortOrderChange = (item: NewArrivalProduct, direction: 'up' | 'down') => {
    const newSortOrder = direction === 'up' ? item.sortOrder - 1 : item.sortOrder + 1
    updateNewArrivalProduct({
      variables: {
        id: item.id,
        input: {
          isActive: item.isActive,
          sortOrder: Math.max(0, newSortOrder)
        }
      },
      onCompleted: () => {
        refetchNewArrivalProducts()
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
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="new-arrivals" className="flex items-center">
            <Sparkles className="w-4 h-4 mr-2" />
            Новые поступления
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>Товар</TableHead>
                      <TableHead className="w-32">Цена</TableHead>
                      <TableHead className="w-32">Скидка</TableHead>
                      <TableHead className="w-24 text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyProducts.map((dailyProduct) => (
                      <TableRow key={dailyProduct.id}>
                        <TableCell className="py-2">
                          <div className="relative w-10 h-10 bg-gray-100 rounded border overflow-hidden flex items-center justify-center">
                            {dailyProduct.product.images?.[0]?.url ? (
                              <NextImage
                                src={dailyProduct.product.images[0].url}
                                alt={dailyProduct.product.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized
                              />
                            ) : (
                              <Package className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-xs">
                            <div className="font-medium text-gray-900">{dailyProduct.product.name}</div>
                            <div className="text-gray-500">
                              {dailyProduct.product.article && <span>Арт: {dailyProduct.product.article}</span>}
                              {dailyProduct.product.brand && <span className="ml-2">| {dailyProduct.product.brand}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          {formatPrice(dailyProduct.product.retailPrice)}
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          {dailyProduct.discount ? (
                            <div>
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                -{dailyProduct.discount}%
                              </Badge>
                              <div className="text-green-600 font-medium mt-1">
                                {formatPrice(calculateDiscountedPrice(dailyProduct.product.retailPrice, dailyProduct.discount))}
                              </div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDailyProduct(dailyProduct)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDailyProduct(dailyProduct.id)}
                              disabled={deletingDaily}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>Товар</TableHead>
                      <TableHead className="w-32">Цена</TableHead>
                      <TableHead className="w-32">Скидка</TableHead>
                      <TableHead className="w-24 text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bestPriceProducts.map((bestPriceProduct) => (
                      <TableRow key={bestPriceProduct.id}>
                        <TableCell className="py-2">
                          <div className="relative w-10 h-10 bg-gray-100 rounded border overflow-hidden flex items-center justify-center">
                            {bestPriceProduct.product.images?.[0]?.url ? (
                              <NextImage
                                src={bestPriceProduct.product.images[0].url}
                                alt={bestPriceProduct.product.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized
                              />
                            ) : (
                              <Package className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-xs">
                            <div className="font-medium text-gray-900">{bestPriceProduct.product.name}</div>
                            <div className="text-gray-500">
                              {bestPriceProduct.product.article && <span>Арт: {bestPriceProduct.product.article}</span>}
                              {bestPriceProduct.product.brand && <span className="ml-2">| {bestPriceProduct.product.brand}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          {formatPrice(bestPriceProduct.product.retailPrice)}
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          <div>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                              -{bestPriceProduct.discount}%
                            </Badge>
                            <div className="text-green-600 font-medium mt-1">
                              {formatPrice(calculateDiscountedPrice(bestPriceProduct.product.retailPrice, bestPriceProduct.discount))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditBestPriceProduct(bestPriceProduct)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteBestPriceProduct(bestPriceProduct.id)}
                              disabled={deletingBestPrice}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>Товар</TableHead>
                      <TableHead className="w-32">Цена</TableHead>
                      <TableHead className="w-32">Статус</TableHead>
                      <TableHead className="w-32 text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSalesProducts.map((topSalesProduct) => (
                      <TableRow key={topSalesProduct.id}>
                        <TableCell className="py-2">
                          <div className="relative w-10 h-10 bg-gray-100 rounded border overflow-hidden flex items-center justify-center">
                            {topSalesProduct.product.images?.[0]?.url ? (
                              <NextImage
                                src={topSalesProduct.product.images[0].url}
                                alt={topSalesProduct.product.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized
                              />
                            ) : (
                              <Package className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-xs">
                            <div className="font-medium text-gray-900">{topSalesProduct.product.name}</div>
                            <div className="text-gray-500">
                              {topSalesProduct.product.article && <span>Арт: {topSalesProduct.product.article}</span>}
                              {topSalesProduct.product.brand && <span className="ml-2">| {topSalesProduct.product.brand}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          {formatPrice(topSalesProduct.product.retailPrice)}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={topSalesProduct.isActive}
                              onCheckedChange={() => handleToggleTopSalesActive(topSalesProduct)}
                            />
                            <span className="text-xs text-gray-500">
                              {topSalesProduct.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTopSalesSortOrderChange(topSalesProduct, 'up')}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTopSalesSortOrderChange(topSalesProduct, 'down')}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTopSalesProduct(topSalesProduct.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-arrivals" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Новые поступления
                </CardTitle>
                <Button
                  onClick={() => {
                    setSelectedNewArrivalProduct(null)
                    setShowNewArrivalProductSelector(true)
                  }}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить товар
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {newArrivalProductsLoading ? (
                <div className="text-center py-8 text-gray-500">Загрузка товаров...</div>
              ) : newArrivalProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Новые поступления пока не выбраны
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>Товар</TableHead>
                      <TableHead className="w-32">Цена</TableHead>
                      <TableHead className="w-32">Статус</TableHead>
                      <TableHead className="w-32 text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newArrivalProducts.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="py-2">
                          <div className="relative w-10 h-10 bg-gray-100 rounded border overflow-hidden flex items-center justify-center">
                            {item.product.images?.[0]?.url ? (
                              <NextImage
                                src={item.product.images[0].url}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized
                              />
                            ) : (
                              <Package className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-xs">
                            <div className="font-medium text-gray-900">{item.product.name}</div>
                            <div className="text-gray-500">
                              {item.product.article && <span>Арт: {item.product.article}</span>}
                              {item.product.brand && <span className="ml-2">| {item.product.brand}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          {formatPrice(item.product.retailPrice)}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.isActive}
                              onCheckedChange={() => handleToggleNewArrivalActive(item)}
                            />
                            <span className="text-xs text-gray-500">
                              {item.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNewArrivalSortOrderChange(item, 'up')}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNewArrivalSortOrderChange(item, 'down')}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteNewArrivalProduct(item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Диалог добавления товара дня */}
      <Dialog open={showDailyProductSelector} onOpenChange={setShowDailyProductSelector}>
        <DialogContent className="max-w-3xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Добавить товар дня</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Поиск товаров */}
            <div className="flex items-center space-x-2">
              <Search className="w-3 h-3 text-gray-400" />
              <Input
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-8 text-xs"
              />
            </div>

            {/* Скидка */}
            <div>
              <Label htmlFor="daily-discount" className="text-xs">Скидка (%)</Label>
              <Input
                id="daily-discount"
                type="number"
                min="0"
                max="100"
                value={dailyDiscount}
                onChange={(e) => setDailyDiscount(Number(e.target.value))}
                placeholder="Размер скидки"
                className="h-8 text-xs"
              />
            </div>

            {/* Список товаров */}
            <div className="max-h-80 overflow-y-auto space-y-1">
              {productsLoading ? (
                <div className="text-center py-4 text-gray-500 text-xs">Загрузка товаров...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">Товары не найдены</div>
              ) : (
                products.map((product) => (
                  <div key={product.id} className="border rounded p-2 flex items-start gap-2">
                    <div className="flex flex-1 items-start gap-2 min-w-0">
                      <div className="relative w-8 h-8 bg-gray-100 rounded border overflow-hidden flex items-center justify-center flex-shrink-0">
                        {product.images?.[0]?.url ? (
                          <NextImage
                              src={product.images[0].url}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="32px"
                              unoptimized
                            />
                        ) : (
                          <Package className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-xs">{product.name}</h4>
                        <div className="text-xs text-gray-500">
                          {product.article && <span>Арт: {product.article}</span>}
                          {product.brand && <span className="ml-1">| {product.brand}</span>}
                          <span className="ml-1">| {formatPrice(product.retailPrice)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAddDailyProduct(product.id)}
                      disabled={creatingDaily}
                      size="sm"
                      className="ml-auto h-7 text-xs"
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
        <DialogContent className="max-w-3xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Добавить товар с лучшей ценой</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Поиск товаров */}
            <div className="flex items-center space-x-2">
              <Search className="w-3 h-3 text-gray-400" />
              <Input
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-8 text-xs"
              />
            </div>

            {/* Скидка */}
            <div>
              <Label htmlFor="best-price-discount" className="text-xs">Скидка (%)</Label>
              <Input
                id="best-price-discount"
                type="number"
                min="0"
                max="100"
                value={bestPriceDiscount}
                onChange={(e) => setBestPriceDiscount(Number(e.target.value))}
                placeholder="Размер скидки"
                className="h-8 text-xs"
              />
            </div>

            {/* Список товаров */}
            <div className="max-h-80 overflow-y-auto space-y-1">
              {productsLoading ? (
                <div className="text-center py-4 text-gray-500 text-xs">Загрузка товаров...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">Товары не найдены</div>
              ) : (
                products.map((product) => (
                  <div key={product.id} className="border rounded p-2 flex items-start gap-2">
                    <div className="flex flex-1 items-start gap-2 min-w-0">
                      <div className="relative w-8 h-8 bg-gray-100 rounded border overflow-hidden flex items-center justify-center flex-shrink-0">
                        {product.images?.[0]?.url ? (
                          <NextImage
                              src={product.images[0].url}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="32px"
                              unoptimized
                            />
                        ) : (
                          <Package className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-xs">{product.name}</h4>
                        <div className="text-xs text-gray-500">
                          {product.article && <span>Арт: {product.article}</span>}
                          {product.brand && <span className="ml-1">| {product.brand}</span>}
                          <span className="ml-1">| {formatPrice(product.retailPrice)}</span>
                          {bestPriceDiscount > 0 && (
                            <span className="text-green-600 ml-1">
                              → {formatPrice(calculateDiscountedPrice(product.retailPrice, bestPriceDiscount))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAddBestPriceProduct(product.id)}
                      disabled={creatingBestPrice}
                      size="sm"
                      className="ml-auto h-7 text-xs"
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

      {/* Диалог добавления товара в новые поступления */}
      <Dialog
        open={showNewArrivalProductSelector}
        onOpenChange={(open) => {
          setShowNewArrivalProductSelector(open)
          if (!open) {
            setSelectedNewArrivalProduct(null)
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Добавить товар в новые поступления</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Search className="w-3 h-3 text-gray-400" />
              <Input
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-8 text-xs"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              {productsLoading ? (
                <div className="text-center py-4 text-gray-500 text-xs">Загрузка товаров...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">Товары не найдены</div>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    className={`border rounded p-2 flex items-start gap-2 cursor-pointer transition ${
                      selectedNewArrivalProduct?.id === product.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedNewArrivalProduct(product)}
                  >
                    <div className="flex flex-1 items-start gap-2 min-w-0">
                      <div className="relative w-8 h-8 bg-gray-100 rounded border overflow-hidden flex items-center justify-center flex-shrink-0">
                        {product.images?.[0]?.url ? (
                          <NextImage
                              src={product.images[0].url}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="32px"
                              unoptimized
                            />
                        ) : (
                          <Package className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-xs">{product.name}</h4>
                        <div className="text-xs text-gray-500">
                          {product.article && <span>Арт: {product.article}</span>}
                          {product.brand && <span className="ml-1">| {product.brand}</span>}
                          <span className="ml-1">| {formatPrice(product.retailPrice)}</span>
                        </div>
                      </div>
                    </div>
                    {selectedNewArrivalProduct?.id === product.id && (
                      <Badge variant="secondary" className="flex-shrink-0 ml-auto text-xs">
                        Выбран
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>

            {selectedNewArrivalProduct && (
              <div className="pt-3 border-t">
                <Button onClick={handleAddNewArrivalProduct} className="w-full h-8 text-xs">
                  Добавить выбранный товар
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления товара в топ продаж */}
      <Dialog open={showTopSalesProductSelector} onOpenChange={setShowTopSalesProductSelector}>
        <DialogContent className="max-w-3xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Добавить товар в топ продаж</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Поиск товаров */}
            <div className="flex items-center space-x-2">
              <Search className="w-3 h-3 text-gray-400" />
              <Input
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-8 text-xs"
              />
            </div>

            {/* Список товаров */}
            <div className="max-h-80 overflow-y-auto space-y-1">
              {productsLoading ? (
                <div className="text-center py-4 text-gray-500 text-xs">Загрузка товаров...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">Товары не найдены</div>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    className={`border rounded p-2 flex items-start gap-2 cursor-pointer transition-colors ${
                      selectedProduct?.id === product.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="flex flex-1 items-start gap-2 min-w-0">
                      <div className="relative w-8 h-8 bg-gray-100 rounded border overflow-hidden flex items-center justify-center flex-shrink-0">
                        {product.images?.[0]?.url ? (
                          <NextImage
                              src={product.images[0].url}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="32px"
                              unoptimized
                            />
                        ) : (
                          <Package className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-xs">{product.name}</h4>
                        <div className="text-xs text-gray-500">
                          {product.article && <span>Арт: {product.article}</span>}
                          {product.brand && <span className="ml-1">| {product.brand}</span>}
                          <span className="ml-1">| {formatPrice(product.retailPrice)}</span>
                        </div>
                      </div>
                    </div>
                    {selectedProduct?.id === product.id && (
                      <Badge variant="secondary" className="flex-shrink-0 ml-auto text-xs">
                        Выбран
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>

            {selectedProduct && (
              <div className="pt-3 border-t">
                <Button onClick={handleAddTopSalesProduct} className="w-full h-8 text-xs">
                  Добавить выбранный товар
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования товара дня */}
      <Dialog open={!!editingDailyProduct} onOpenChange={() => setEditingDailyProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Редактировать товар дня</DialogTitle>
          </DialogHeader>

          {editingDailyProduct && (
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-sm">{editingDailyProduct.product.name}</h3>
                <p className="text-xs text-gray-500">
                  {editingDailyProduct.product.article && `Арт: ${editingDailyProduct.product.article} | `}
                  {editingDailyProduct.product.brand && `${editingDailyProduct.product.brand} | `}
                  {formatPrice(editingDailyProduct.product.retailPrice)}
                </p>
              </div>

              <div>
                <Label htmlFor="edit-daily-discount" className="text-xs">Скидка (%)</Label>
                <Input
                  id="edit-daily-discount"
                  type="number"
                  min="0"
                  max="100"
                  value={dailyDiscount}
                  onChange={(e) => setDailyDiscount(Number(e.target.value))}
                  placeholder="Размер скидки"
                  className="h-8 text-xs"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingDailyProduct(null)} className="h-8 text-xs">
                  Отмена
                </Button>
                <Button onClick={handleUpdateDailyProduct} disabled={updatingDaily} className="h-8 text-xs">
                  Сохранить
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования товара с лучшей ценой */}
      <Dialog open={!!editingBestPriceProduct} onOpenChange={() => setEditingBestPriceProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Редактировать товар с лучшей ценой</DialogTitle>
          </DialogHeader>

          {editingBestPriceProduct && (
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-sm">{editingBestPriceProduct.product.name}</h3>
                <p className="text-xs text-gray-500">
                  {editingBestPriceProduct.product.article && `Арт: ${editingBestPriceProduct.product.article} | `}
                  {editingBestPriceProduct.product.brand && `${editingBestPriceProduct.product.brand} | `}
                  {formatPrice(editingBestPriceProduct.product.retailPrice)}
                </p>
              </div>

              <div>
                <Label htmlFor="edit-best-price-discount" className="text-xs">Скидка (%)</Label>
                <Input
                  id="edit-best-price-discount"
                  type="number"
                  min="0"
                  max="100"
                  value={bestPriceDiscount}
                  onChange={(e) => setBestPriceDiscount(Number(e.target.value))}
                  placeholder="Размер скидки"
                  className="h-8 text-xs"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingBestPriceProduct(null)} className="h-8 text-xs">
                  Отмена
                </Button>
                <Button onClick={handleUpdateBestPriceProduct} disabled={updatingBestPrice} className="h-8 text-xs">
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
