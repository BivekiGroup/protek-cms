"use client"

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  ChevronRight, 
  ChevronDown, 
  Settings, 
  Plus, 
  Edit, 
  Trash2,
  EyeOff,
  Loader2
} from 'lucide-react'
import { CategoryForm } from './CategoryForm'
import { DELETE_CATEGORY } from '@/lib/graphql/mutations'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  slug: string
  isHidden: boolean
  parentId?: string
  children: Category[]
  level: number
  _count?: { products: number }
}

interface CategoryTreeProps {
  categories: Category[]
  selectedCategoryId: string | null
  onCategorySelect: (categoryId: string | null) => void
  onCategoryEdit: (category: Category) => void
  onCategoryCreated: () => void
  loading?: boolean
}

interface CategoryItemProps {
  category: Category
  selectedCategoryId: string | null
  onCategorySelect: (categoryId: string | null) => void
  onCategoryEdit: (category: Category) => void
  onCategoryCreated: () => void
  level?: number
}

// Рекурсивная функция для подсчета товаров во всей ветке категорий
const getTotalProductCount = (category: Category): number => {
  const directCount = category._count?.products || 0
  const childrenCount = category.children?.reduce((sum, child) => sum + getTotalProductCount(child), 0) || 0
  return directCount + childrenCount
}

const CategoryItem = ({ 
  category, 
  selectedCategoryId, 
  onCategorySelect, 
  onCategoryEdit,
  onCategoryCreated,
  level = 0 
}: CategoryItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false)
  const [deleteCategory] = useMutation(DELETE_CATEGORY)

  const hasChildren = category.children && category.children.length > 0
  const isSelected = selectedCategoryId === category.id
  const paddingLeft = level * 12 + 8
  const totalProducts = getTotalProductCount(category)
  const hasProducts = totalProducts > 0

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleSelect = () => {
    onCategorySelect(category.id)
  }

  const handleEdit = () => {
    onCategoryEdit(category)
  }

  const handleDelete = async () => {
    if (confirm(`Вы уверены, что хотите удалить категорию "${category.name}"?`)) {
      try {
        await deleteCategory({ variables: { id: category.id } })
        onCategoryCreated() // Обновляем список
      } catch (error) {
        console.error('Ошибка удаления категории:', error)
        alert('Не удалось удалить категорию')
      }
    }
  }

  const handleCreateSubcategory = () => {
    setShowSubcategoryForm(true)
  }

  const handleSubcategoryCreated = () => {
    setShowSubcategoryForm(false)
    onCategoryCreated()
    setIsExpanded(true) // Раскрываем категорию чтобы показать новую подкатегорию
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center py-1.5 px-2 hover:bg-gray-50 cursor-pointer group",
          isSelected && "bg-blue-50 border-r-2 border-blue-500"
        )}
        style={{ paddingLeft }}
      >
        {/* Иконка раскрытия */}
        <div className="w-3.5 h-3.5 mr-1.5 flex items-center justify-center">
          {hasChildren && (
            <button onClick={handleToggle} className="p-0.5 hover:bg-gray-200 rounded">
              {isExpanded ? (
                <ChevronDown className="w-2.5 h-2.5" />
              ) : (
                <ChevronRight className="w-2.5 h-2.5" />
              )}
            </button>
          )}
        </div>

        {/* Название категории */}
        <div
          className="flex-1 flex items-center min-w-0"
          onClick={handleSelect}
        >
          <span className={cn(
            "truncate text-xs",
            isSelected && hasProducts && "font-medium text-blue-700",
            isSelected && !hasProducts && "font-medium text-blue-400",
            !isSelected && hasProducts && "text-gray-700",
            !isSelected && !hasProducts && "text-gray-400",
            category.isHidden && "opacity-50 italic"
          )}>
            {category.name}
            {category.isHidden && (
              <EyeOff className="w-2.5 h-2.5 inline ml-1" />
            )}
          </span>
          <span className={cn(
            "ml-1.5 text-[10px]",
            hasProducts ? "text-gray-500 font-medium" : "text-gray-300"
          )}>
            ({totalProducts})
          </span>
        </div>

        {/* Меню действий */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-5 h-5 p-0 opacity-0 group-hover:opacity-100"
            >
              <Settings className="w-2.5 h-2.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCreateSubcategory}>
              <Plus className="w-4 h-4 mr-2" />
              Создать подкатегорию
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Подкатегории */}
      {hasChildren && isExpanded && (
        <div>
          {category.children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={onCategorySelect}
              onCategoryEdit={onCategoryEdit}
              onCategoryCreated={onCategoryCreated}
              level={level + 1}
            />
          ))}
        </div>
      )}

      {/* Диалог создания подкатегории */}
      <Dialog open={showSubcategoryForm} onOpenChange={setShowSubcategoryForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Создать подкатегорию в &quot;{category.name}&quot;</DialogTitle>
          </DialogHeader>
          <CategoryForm
            parentCategoryId={category.id}
            onSuccess={handleSubcategoryCreated}
            onCancel={() => setShowSubcategoryForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

export const CategoryTree = ({ 
  categories, 
  selectedCategoryId, 
  onCategorySelect, 
  onCategoryEdit,
  onCategoryCreated,
  loading 
}: CategoryTreeProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Фильтруем только корневые категории (без родителя)
  const rootCategories = categories.filter(cat => !cat.parentId)

  return (
    <div className="py-2">
      {/* Кнопка "Все товары" */}
      <div className="px-3 pb-3">
        <Button
          variant={selectedCategoryId === null ? "default" : "outline"}
          size="sm"
          className={cn(
            "w-full justify-start text-sm font-medium",
            selectedCategoryId === null && "bg-blue-600 hover:bg-blue-700 text-white"
          )}
          onClick={() => onCategorySelect(null)}
        >
          Все товары
        </Button>
      </div>

      {/* Разделитель */}
      <div className="border-t border-gray-200 my-2" />

      {/* Категории */}
      {rootCategories.length === 0 ? (
        <div className="px-3 py-4 text-center text-sm text-gray-500">
          Категории не созданы
        </div>
      ) : (
        rootCategories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={onCategorySelect}
            onCategoryEdit={onCategoryEdit}
            onCategoryCreated={onCategoryCreated}
          />
        ))
      )}
    </div>
  )
} 