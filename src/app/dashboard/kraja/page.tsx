"use client"

import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Shield,
  Package,
  Loader2,
  ChevronRight,
  Eye
} from 'lucide-react'
import { GET_PARTSINDEX_CATEGORIES, GET_PARTSAPI_CATEGORIES } from '@/lib/graphql/queries'
import { KrajaCategories } from '@/components/kraja/KrajaCategories'
import { KrajaCategoryItems } from '@/components/kraja/KrajaCategoryItems'
import { KrajaSavedTables } from '@/components/kraja/KrajaSavedTables'

interface Category {
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

export default function KrajaPage() {
  const [activeTab, setActiveTab] = useState<'partsindex' | 'partsapi' | 'saved'>('partsindex')
  const [selectedCategory, setSelectedCategory] = useState<Category | PartsAPICategory | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingTable, setViewingTable] = useState<{categoryId: string, categoryType: string, tableName: string} | null>(null)

  // Загрузка категорий PartsIndex
  const { data: partsIndexData, loading: partsIndexLoading, error: partsIndexError } = useQuery(
    GET_PARTSINDEX_CATEGORIES,
    {
      variables: { lang: 'ru' },
      errorPolicy: 'all'
    }
  )

  // Загрузка категорий PartsAPI
  const { data: partsAPIData, loading: partsAPILoading, error: partsAPIError } = useQuery(
    GET_PARTSAPI_CATEGORIES,
    {
      variables: { carId: 9877, carType: 'PC' },
      errorPolicy: 'all'
    }
  )

  const partsIndexCategories = partsIndexData?.partsIndexCategoriesWithGroups || []
  const partsAPICategories = partsAPIData?.partsAPICategories || []

  const handleCategorySelect = (category: Category | PartsAPICategory, group?: any) => {
    setSelectedCategory(category)
    setSelectedGroup(group || null)
  }

  const handleBackToCategories = () => {
    setSelectedCategory(null)
    setSelectedGroup(null)
    setViewingTable(null)
  }

  const handleViewTable = (categoryId: string, categoryType: string, tableName: string) => {
    setViewingTable({ categoryId, categoryType, tableName })
    setActiveTab('saved')
  }

  const filteredPartsIndexCategories = partsIndexCategories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPartsAPICategories = partsAPICategories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Если выбрана категория, показываем её товары
  if (selectedCategory) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-6">
          {/* Заголовок с кнопкой возврата */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleBackToCategories}
              className="flex items-center gap-2"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Назад к категориям
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Кража - {selectedCategory.name}</h1>
              {selectedGroup && (
                <>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <span className="text-lg text-gray-600">{selectedGroup.name}</span>
                </>
              )}
            </div>
          </div>

          {/* Товары категории */}
          <KrajaCategoryItems 
            category={selectedCategory}
            group={selectedGroup}
            categoryType={activeTab === 'partsindex' ? 'partsindex' : 'partsapi'}
          />
        </div>
      </div>
    )
  }

  // Если просматриваем сохраненную таблицу
  if (viewingTable && activeTab === 'saved') {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-6">
          {/* Заголовок с кнопкой возврата */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleBackToCategories}
              className="flex items-center gap-2"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Назад к таблицам
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Сохраненные данные - {viewingTable.tableName}</h1>
              <Badge variant="secondary">
                {viewingTable.categoryType.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Содержимое сохраненной таблицы */}
          <KrajaCategoryItems 
            category={{ id: viewingTable.categoryId, name: viewingTable.tableName }}
            categoryType={viewingTable.categoryType.toLowerCase() as 'partsindex' | 'partsapi'}
            isViewingSavedData={true}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Кража</h1>
            <p className="text-gray-600">
              Просмотр категорий и товаров из PartsIndex и PartsAPI
            </p>
          </div>
        </div>

        {/* Поиск */}
        {activeTab !== 'saved' && (
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по категориям..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-600">Категорий PartsIndex</div>
                  <div className="text-2xl font-bold">{partsIndexCategories.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">Категорий PartsAPI</div>
                  <div className="text-2xl font-bold">{partsAPICategories.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-sm text-gray-600">Всего категорий</div>
                  <div className="text-2xl font-bold">{partsIndexCategories.length + partsAPICategories.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Табы с категориями */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'partsindex' | 'partsapi' | 'saved')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="partsindex" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              PartsIndex 
              <Badge variant="secondary">{partsIndexCategories.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="partsapi" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              PartsAPI 
              <Badge variant="secondary">{partsAPICategories.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Сохраненные
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partsindex" className="space-y-4">
            {partsIndexLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Загрузка категорий PartsIndex...</span>
              </div>
            ) : partsIndexError ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-red-600">
                    Ошибка загрузки категорий PartsIndex: {partsIndexError.message}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <KrajaCategories 
                categories={filteredPartsIndexCategories}
                onCategorySelect={handleCategorySelect}
                type="partsindex"
              />
            )}
          </TabsContent>

          <TabsContent value="partsapi" className="space-y-4">
            {partsAPILoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Загрузка категорий PartsAPI...</span>
              </div>
            ) : partsAPIError ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-red-600">
                    Ошибка загрузки категорий PartsAPI: {partsAPIError.message}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <KrajaCategories 
                categories={filteredPartsAPICategories}
                onCategorySelect={handleCategorySelect}
                type="partsapi"
              />
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            <KrajaSavedTables onViewTable={handleViewTable} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 