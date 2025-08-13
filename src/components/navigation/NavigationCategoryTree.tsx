'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  GET_NAVIGATION_CATEGORIES,
  GET_PARTSINDEX_CATEGORIES 
} from '@/lib/graphql/queries'
import {
  CREATE_NAVIGATION_CATEGORY,
  UPDATE_NAVIGATION_CATEGORY,
  DELETE_NAVIGATION_CATEGORY
} from '@/lib/graphql/mutations'
import { Loader2, Plus, Edit, Trash2, Image as ImageIcon, Folder, Settings, Eye, EyeOff } from 'lucide-react'
import NavigationCategoryForm from './NavigationCategoryForm'

interface NavigationCategory {
  id: string
  partsIndexCatalogId: string
  partsIndexGroupId?: string
  icon?: string
  isHidden: boolean
  sortOrder: number
  name: string
  catalogName: string
  groupName?: string
}

interface PartsIndexCategory {
  id: string
  name: string
  image?: string
  groups?: PartsIndexGroup[]
}

interface PartsIndexGroup {
  id: string
  name: string
  image?: string
  subgroups?: PartsIndexGroup[]
}

export default function NavigationCategoryTree() {
  const [editingCategory, setEditingCategory] = useState<NavigationCategory | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Загрузка навигационных категорий (с иконками)
  const { 
    data: navigationData, 
    loading: navigationLoading, 
    error: navigationError,
    refetch: refetchNavigation
  } = useQuery(GET_NAVIGATION_CATEGORIES, {
    errorPolicy: 'all'
  })

  // Загрузка категорий PartsIndex
  const { 
    data: partsIndexData, 
    loading: partsIndexLoading, 
    error: partsIndexError 
  } = useQuery(GET_PARTSINDEX_CATEGORIES, {
    variables: { lang: 'ru' },
    errorPolicy: 'all'
  })

  // Мутации
  const [createCategory, { loading: creating }] = useMutation(CREATE_NAVIGATION_CATEGORY, {
    onCompleted: () => {
      refetchNavigation()
      handleCloseForm()
    },
    onError: (error) => {
      console.error('Ошибка создания категории:', error)
      alert('Не удалось создать иконку для категории')
    }
  })

  const [updateCategory, { loading: updating }] = useMutation(UPDATE_NAVIGATION_CATEGORY, {
    onCompleted: () => {
      refetchNavigation()
      handleCloseForm()
    },
    onError: (error) => {
      console.error('Ошибка обновления категории:', error)
      alert('Не удалось обновить иконку категории')
    }
  })

  const [deleteCategory, { loading: deleting }] = useMutation(DELETE_NAVIGATION_CATEGORY, {
    onCompleted: () => {
      refetchNavigation()
    },
    onError: (error) => {
      console.error('Ошибка удаления категории:', error)
      alert('Не удалось удалить иконку категории')
    }
  })

  const navigationCategories = navigationData?.navigationCategories || []
  const partsIndexCategories = partsIndexData?.partsIndexCategoriesWithGroups || []

  const handleSubmit = async (formData: any) => {
    try {
      if (editingCategory) {
        await updateCategory({
          variables: {
            id: editingCategory.id,
            input: formData
          }
        })
      } else {
        await createCategory({
          variables: {
            input: formData
          }
        })
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error)
    }
  }

  const handleEdit = (category: NavigationCategory) => {
    setEditingCategory(category)
    setShowForm(true)
  }

  const handleDelete = async (category: NavigationCategory) => {
    if (confirm(`Удалить иконку для категории "${category.name}"?`)) {
      await deleteCategory({
        variables: { id: category.id }
      })
    }
  }

  const handleCloseForm = () => {
    setEditingCategory(null)
    setShowForm(false)
  }

  // Функция для получения полного пути категории
  const getCategoryPath = (catalogId: string, groupId?: string) => {
    const catalog = partsIndexCategories.find(c => c.id === catalogId)
    if (!catalog) return 'Неизвестная категория'
    
    if (!groupId) return catalog.name
    
    // Рекурсивный поиск группы
    const findGroup = (groups: PartsIndexGroup[]): PartsIndexGroup | null => {
      for (const group of groups) {
        if (group.id === groupId) return group
        if (group.subgroups) {
          const found = findGroup(group.subgroups)
          if (found) return found
        }
      }
      return null
    }
    
    const group = catalog.groups ? findGroup(catalog.groups) : null
    return group ? `${catalog.name} → ${group.name}` : catalog.name
  }

  // Проверка есть ли иконка для категории
  const hasIcon = (catalogId: string, groupId?: string) => {
    return navigationCategories.some(nav => 
      nav.partsIndexCatalogId === catalogId && 
      nav.partsIndexGroupId === groupId
    )
  }

  // Получение иконки для категории
  const getIcon = (catalogId: string, groupId?: string) => {
    return navigationCategories.find(nav => 
      nav.partsIndexCatalogId === catalogId && 
      nav.partsIndexGroupId === groupId
    )
  }

  if (showForm) {
    return (
      <NavigationCategoryForm
        category={editingCategory}
        onSubmit={handleSubmit}
        onCancel={handleCloseForm}
        isLoading={creating || updating}
      />
    )
  }

  if (navigationLoading || partsIndexLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Загрузка категорий...</span>
        </CardContent>
      </Card>
    )
  }

  if (navigationError || partsIndexError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Ошибка загрузки категорий: {navigationError?.message || partsIndexError?.message}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Иконки навигации</h2>
          <p className="text-gray-600">
            Привязка иконок к категориям PartsIndex для отображения в навигации сайта
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить иконку
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">Каталогов PartsIndex</div>
                <div className="text-2xl font-bold">{partsIndexCategories.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm text-gray-600">С иконками</div>
                <div className="text-2xl font-bold">{navigationCategories.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-sm text-gray-600">Активных</div>
                <div className="text-2xl font-bold">
                  {navigationCategories.filter(cat => !cat.isHidden).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список категорий с иконками */}
      {navigationCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Категории с иконками</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {navigationCategories
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((navCategory) => (
                <div
                  key={navCategory.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {/* Иконка */}
                    <div className="w-12 h-12 border rounded-lg flex items-center justify-center overflow-hidden">
                      {navCategory.icon ? (
                        <img 
                          src={navCategory.icon} 
                          alt={navCategory.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Информация */}
                    <div>
                      <div className="font-medium">{navCategory.name}</div>
                      <div className="text-sm text-gray-600">
                        {getCategoryPath(navCategory.partsIndexCatalogId, navCategory.partsIndexGroupId)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Сортировка: {navCategory.sortOrder}
                        </Badge>
                        {navCategory.isHidden && (
                          <Badge variant="destructive" className="text-xs">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Скрыта
                          </Badge>
                        )}
                        {!navCategory.isHidden && (
                          <Badge variant="default" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            Видима
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Действия */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(navCategory)}
                      disabled={deleting}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(navCategory)}
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Инструкции */}
      <Card>
        <CardHeader>
          <CardTitle>Как использовать</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>1. Выберите каталог:</strong> Из списка каталогов PartsIndex выберите тот, для которого хотите добавить иконку.
          </p>
          <p>
            <strong>2. Выберите группу (необязательно):</strong> Если хотите добавить иконку для конкретной группы внутри каталога, выберите её. Иначе иконка будет применена ко всему каталогу.
          </p>
          <p>
            <strong>3. Загрузите иконку:</strong> Выберите небольшое изображение (рекомендуется 32x32 пикселя) которое будет отображаться в навигации сайта.
          </p>
          <p>
            <strong>4. Настройте отображение:</strong> Установите порядок сортировки и видимость категории в навигации.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 