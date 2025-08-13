'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { 
  Package, 
  Search, 
  Loader2, 
  AlertCircle,
  Eye,
  Filter,
  Grid,
  List
} from 'lucide-react'
import { GET_PARTSINDEX_CATALOG_ENTITIES, GET_PARTSAPI_ARTICLES, GET_CATEGORY_PRODUCTS } from '@/lib/graphql/queries'

interface PartsIndexCategory {
  id: string
  name: string
  image?: string
  groups?: Array<{
    id: string
    name: string
    image?: string
    subgroups?: Array<{
      id: string
      name: string
      image?: string
      entityNames?: Array<{
        id: string
        name: string
      }>
    }>
    entityNames?: Array<{
      id: string
      name: string
    }>
  }>
}

interface PartsAPICategory {
  id: string
  name: string
  level: number
  parentId?: string
  children?: PartsAPICategory[]
}

interface KrajaCategoryItemsProps {
  category: PartsIndexCategory | PartsAPICategory
  group?: any
  categoryType: 'partsindex' | 'partsapi'
  isViewingSavedData?: boolean
}

interface PartsIndexEntity {
  id: string
  name: string
  image?: string
  brand?: string
  description?: string
  price?: number
}

interface PartsAPIArticle {
  supBrand: string
  supId: number
  productGroup: string
  ptId: number
  artSupBrand: string
  artArticleNr: string
  artId: string
}

export const KrajaCategoryItems = ({ category, group, categoryType, isViewingSavedData = false }: KrajaCategoryItemsProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = isViewingSavedData ? 100 : 20

  // Для PartsIndex
  const { 
    data: partsIndexData, 
    loading: partsIndexLoading, 
    error: partsIndexError,
    refetch: refetchPartsIndex
  } = useQuery(GET_PARTSINDEX_CATALOG_ENTITIES, {
    variables: {
      catalogId: categoryType === 'partsindex' ? category.id : undefined,
      groupId: group?.id || undefined,
      lang: 'ru',
      limit: itemsPerPage,
      page: currentPage,
      q: searchQuery || undefined
    },
    skip: categoryType !== 'partsindex' || !category.id,
    errorPolicy: 'all'
  })

  // Для PartsAPI - используем strId (нужно преобразовать id в число)
  const { 
    data: partsAPIData, 
    loading: partsAPILoading, 
    error: partsAPIError,
    refetch: refetchPartsAPI
  } = useQuery(GET_PARTSAPI_ARTICLES, {
    variables: {
      strId: categoryType === 'partsapi' ? parseInt(category.id) : undefined,
      carId: 9877,
      carType: 'PC'
    },
    skip: categoryType !== 'partsapi' || !category.id || isViewingSavedData,
    errorPolicy: 'all'
  })

  // Для просмотра сохраненных данных
  const { 
    data: savedData, 
    loading: savedLoading, 
    error: savedError,
    refetch: refetchSaved
  } = useQuery(GET_CATEGORY_PRODUCTS, {
    variables: {
      categoryId: category.id,
      categoryType: categoryType.toUpperCase(),
      search: searchQuery || undefined,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage
    },
    skip: !isViewingSavedData,
    errorPolicy: 'all'
  })

  // Обновляем поиск с задержкой
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isViewingSavedData) {
        refetchSaved()
      } else if (categoryType === 'partsindex') {
        refetchPartsIndex()
      } else {
        refetchPartsAPI()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, categoryType, isViewingSavedData, refetchPartsIndex, refetchPartsAPI, refetchSaved])

  const isLoading = isViewingSavedData 
    ? savedLoading 
    : (categoryType === 'partsindex' ? partsIndexLoading : partsAPILoading)
  
  const error = isViewingSavedData 
    ? savedError 
    : (categoryType === 'partsindex' ? partsIndexError : partsAPIError)
  
  const items = isViewingSavedData
    ? savedData?.getCategoryProducts?.products || []
    : (categoryType === 'partsindex' 
        ? partsIndexData?.partsIndexCatalogEntities?.list || []
        : partsAPIData?.partsAPIArticles || [])

  const renderPartsIndexItem = (item: PartsIndexEntity) => (
    <Card key={item.id} className={`hover:shadow-md transition-shadow ${viewMode === 'list' ? 'mb-2' : ''}`}>
      <CardContent className={`${viewMode === 'grid' ? 'p-4' : 'p-3'}`}>
        {viewMode === 'grid' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 line-clamp-2">{item.name}</h4>
                {item.brand && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {item.brand}
                  </Badge>
                )}
              </div>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
            )}
            {item.price && (
              <div className="text-lg font-semibold text-blue-600">
                {item.price.toLocaleString('ru-RU')} ₽
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Подробнее
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{item.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                {item.brand && (
                  <Badge variant="outline" className="text-xs">
                    {item.brand}
                  </Badge>
                )}
                {item.price && (
                  <span className="text-sm font-semibold text-blue-600">
                    {item.price.toLocaleString('ru-RU')} ₽
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Подробнее
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderSavedItem = (item: any) => (
    <Card key={item.id} className={`hover:shadow-md transition-shadow ${viewMode === 'list' ? 'mb-2' : ''}`}>
      <CardContent className={`${viewMode === 'grid' ? 'p-4' : 'p-3'}`}>
        {viewMode === 'grid' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 line-clamp-2">{item.name}</h4>
                {item.brand && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {item.brand}
                  </Badge>
                )}
              </div>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
            )}
            {item.price && (
              <div className="text-lg font-semibold text-blue-600">
                {parseFloat(item.price).toLocaleString('ru-RU')} ₽
              </div>
            )}
            <div className="text-xs text-gray-500">
              Сохранено: {new Date(item.created_at).toLocaleDateString('ru-RU')}
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Подробнее
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{item.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                {item.brand && (
                  <Badge variant="outline" className="text-xs">
                    {item.brand}
                  </Badge>
                )}
                {item.price && (
                  <span className="text-sm font-semibold text-blue-600">
                    {parseFloat(item.price).toLocaleString('ru-RU')} ₽
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Подробнее
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderPartsAPIItem = (item: PartsAPIArticle, index: number) => (
    <Card key={`${item.artId}-${index}`} className={`hover:shadow-md transition-shadow ${viewMode === 'list' ? 'mb-2' : ''}`}>
      <CardContent className={`${viewMode === 'grid' ? 'p-4' : 'p-3'}`}>
        {viewMode === 'grid' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{item.artArticleNr}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.artSupBrand}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Группа: {item.productGroup}</p>
              <p className="text-xs text-gray-500">Поставщик: {item.supBrand}</p>
              <p className="text-xs text-gray-500">ID: {item.artId}</p>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Подробнее
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{item.artArticleNr}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {item.artSupBrand}
                </Badge>
                <span className="text-xs text-gray-500">{item.productGroup}</span>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Подробнее
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Панель управления */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Поиск */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Элементы управления */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {items.length} товаров
              </Badge>
              
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Содержимое */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mr-3" />
              <span className="text-gray-600">Загрузка товаров...</span>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-red-600">
              <AlertCircle className="h-6 w-6 mr-2" />
              <span>Ошибка загрузки: {error.message}</span>
            </div>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Товары не найдены</p>
              <p className="text-sm">Попробуйте изменить критерии поиска</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-2'
        }>
          {isViewingSavedData
            ? items.map((item: any) => renderSavedItem(item))
            : (categoryType === 'partsindex' 
                ? items.map((item: PartsIndexEntity) => renderPartsIndexItem(item))
                : items.map((item: PartsAPIArticle, index: number) => renderPartsAPIItem(item, index))
              )
          }
        </div>
      )}

      {/* Пагинация и статистика */}
      {isViewingSavedData && savedData?.getCategoryProducts && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Показано {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, savedData.getCategoryProducts.total)} из {savedData.getCategoryProducts.total.toLocaleString()} сохраненных товаров
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Предыдущая
                </Button>
                <span className="text-sm text-gray-600 px-2">
                  Страница {currentPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={items.length < itemsPerPage}
                >
                  Следующая
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Пагинация для обычного просмотра */}
      {!isViewingSavedData && items.length >= itemsPerPage && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Предыдущая
              </Button>
              <span className="text-sm text-gray-600 px-4">
                Страница {currentPage}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={items.length < itemsPerPage}
              >
                Следующая
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 