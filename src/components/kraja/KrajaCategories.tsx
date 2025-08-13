'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  ChevronRight, 
  FolderOpen, 
  Layers,
  Image as ImageIcon,
  Download,
  Loader2
} from 'lucide-react'
import { FETCH_CATEGORY_PRODUCTS } from '@/lib/graphql/queries'
import toast from 'react-hot-toast'

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

interface KrajaCategoriesProps {
  categories: PartsIndexCategory[] | PartsAPICategory[]
  onCategorySelect: (category: PartsIndexCategory | PartsAPICategory, group?: any) => void
  type: 'partsindex' | 'partsapi'
}

export const KrajaCategories = ({ categories, onCategorySelect, type }: KrajaCategoriesProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [fetchingCategories, setFetchingCategories] = useState<Set<string>>(new Set())

  const [fetchCategoryProducts] = useMutation(FETCH_CATEGORY_PRODUCTS, {
    onCompleted: (data) => {
      if (data.fetchCategoryProducts.success) {
        toast.success(`✅ ${data.fetchCategoryProducts.message}`)
      } else {
        toast.error(`❌ ${data.fetchCategoryProducts.message}`)
      }
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`)
    }
  })

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const handleCategoryClick = (category: PartsIndexCategory | PartsAPICategory, group?: any) => {
    onCategorySelect(category, group)
  }

  const handleFetchProducts = async (
    category: PartsIndexCategory | PartsAPICategory, 
    group?: any,
    fetchAll: boolean = false
  ) => {
    const fetchKey = group ? `${category.id}_${group.id}` : category.id
    
    setFetchingCategories(prev => new Set(prev).add(fetchKey))

    try {
      await fetchCategoryProducts({
        variables: {
          input: {
            categoryId: category.id,
            categoryName: category.name,
            categoryType: type.toUpperCase(),
            groupId: group?.id,
            groupName: group?.name,
            fetchAll,
            limit: fetchAll ? 1000 : 100
          }
        }
      })
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setFetchingCategories(prev => {
        const newSet = new Set(prev)
        newSet.delete(fetchKey)
        return newSet
      })
    }
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Категории не найдены</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (type === 'partsindex') {
    const partsIndexCategories = categories as PartsIndexCategory[]
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partsIndexCategories.map((category) => (
          <Card key={category.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Заголовок категории */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center overflow-hidden">
                    {category.image ? (
                      <img 
                        src={category.image} 
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {category.groups?.length || 0} групп
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCategory(category.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform ${
                        expandedCategories.has(category.id) ? 'rotate-90' : ''
                      }`} 
                    />
                  </Button>
                </div>

                {/* Группы категории */}
                {expandedCategories.has(category.id) && category.groups && (
                  <div className="space-y-2 mt-3 border-t pt-3">
                                         {category.groups.map((group) => (
                       <div key={group.id} className="space-y-2">
                         <div className="flex items-center gap-2">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleCategoryClick(category, group)}
                             className="flex-1 justify-start text-left hover:bg-blue-50"
                           >
                             <div className="flex items-center gap-2">
                               <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                 {group.image ? (
                                   <img 
                                     src={group.image} 
                                     alt={group.name}
                                     className="w-full h-full object-cover"
                                   />
                                 ) : (
                                   <FolderOpen className="h-3 w-3 text-gray-500" />
                                 )}
                               </div>
                               <span className="text-sm text-gray-700">{group.name}</span>
                               {group.entityNames && (
                                 <Badge variant="outline" className="text-xs ml-auto">
                                   {group.entityNames.length} товаров
                                 </Badge>
                               )}
                             </div>
                           </Button>
                           
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleFetchProducts(category, group, true)}
                             disabled={fetchingCategories.has(`${category.id}_${group.id}`)}
                             className="px-2"
                             title="Сохранить все товары группы"
                           >
                             {fetchingCategories.has(`${category.id}_${group.id}`) ? (
                               <Loader2 className="h-3 w-3 animate-spin" />
                             ) : (
                               <Download className="h-3 w-3" />
                             )}
                           </Button>
                         </div>

                        {/* Подгруппы */}
                        {group.subgroups && group.subgroups.length > 0 && (
                          <div className="ml-6 space-y-1">
                            {group.subgroups.slice(0, 3).map((subgroup) => (
                              <Button
                                key={subgroup.id}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCategoryClick(category, subgroup)}
                                className="w-full justify-start text-left text-xs hover:bg-blue-50"
                              >
                                <div className="flex items-center gap-2">
                                  <Layers className="h-3 w-3 text-gray-400" />
                                  <span className="text-gray-600">{subgroup.name}</span>
                                  {subgroup.entityNames && (
                                    <Badge variant="outline" className="text-xs ml-auto">
                                      {subgroup.entityNames.length}
                                    </Badge>
                                  )}
                                </div>
                              </Button>
                            ))}
                            {group.subgroups.length > 3 && (
                              <div className="text-xs text-gray-500 ml-6">
                                и ещё {group.subgroups.length - 3} подгрупп...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                                 {/* Кнопки действий */}
                 <div className="space-y-2 mt-3">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => handleCategoryClick(category)}
                     className="w-full"
                   >
                     <Package className="h-4 w-4 mr-2" />
                     Просмотреть товары
                   </Button>
                   
                   <Button
                     variant="default"
                     size="sm"
                     onClick={() => handleFetchProducts(category, null, true)}
                     disabled={fetchingCategories.has(category.id)}
                     className="w-full"
                   >
                     {fetchingCategories.has(category.id) ? (
                       <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                     ) : (
                       <Download className="h-4 w-4 mr-2" />
                     )}
                     Сохранить все товары
                   </Button>
                 </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // PartsAPI categories (tree structure)
  const partsAPICategories = categories as PartsAPICategory[]
  
  const renderPartsAPICategory = (category: PartsAPICategory, level: number = 0) => (
    <div key={category.id} className={`${level > 0 ? 'ml-4' : ''}`}>
      <Card className="mb-2 hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-50 rounded flex items-center justify-center">
                <Package className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{category.name}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Уровень {category.level}
                  </Badge>
                  {category.children && category.children.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {category.children.length} подкатегорий
                    </Badge>
                  )}
                </div>
              </div>
            </div>
                         <div className="flex items-center gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => handleCategoryClick(category)}
               >
                 Просмотреть
               </Button>
               
               <Button
                 variant="default"
                 size="sm"
                 onClick={() => handleFetchProducts(category, null, true)}
                 disabled={fetchingCategories.has(category.id)}
                 title="Сохранить все товары категории"
               >
                 {fetchingCategories.has(category.id) ? (
                   <Loader2 className="h-3 w-3 animate-spin" />
                 ) : (
                   <Download className="h-3 w-3" />
                 )}
               </Button>
               
               {category.children && category.children.length > 0 && (
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => toggleCategory(category.id)}
                 >
                   <ChevronRight 
                     className={`h-4 w-4 transition-transform ${
                       expandedCategories.has(category.id) ? 'rotate-90' : ''
                     }`} 
                   />
                 </Button>
               )}
             </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Подкатегории */}
      {expandedCategories.has(category.id) && category.children && (
        <div className="ml-4 mt-2">
          {category.children.map((child) => renderPartsAPICategory(child, level + 1))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-2">
      {partsAPICategories.map((category) => renderPartsAPICategory(category))}
    </div>
  )
} 