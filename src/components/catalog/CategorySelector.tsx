"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Search, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  level?: number
  parentId?: string | null
  children?: Category[]
  _count?: {
    products: number
  }
}

interface CategorySelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onCategorySelect: (categoryId: string, categoryName: string) => void
  title?: string
  description?: string
}

export const CategorySelector = ({ 
  open, 
  onOpenChange, 
  categories, 
  onCategorySelect,
  title = "Выберите категорию",
  description = "Выберите категорию для перемещения товаров"
}: CategorySelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Функция для построения дерева категорий
  const buildCategoryTree = (categories: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>()
    const rootCategories: Category[] = []

    // Создаем карту всех категорий
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] })
    })

    // Строим дерево
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!
      
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(categoryWithChildren)
        }
      } else {
        rootCategories.push(categoryWithChildren)
      }
    })

    return rootCategories
  }

  // Фильтрация категорий по поисковому запросу
  const filterCategories = (categories: Category[], query: string): Category[] => {
    if (!query) return categories

    const filtered: Category[] = []
    
    categories.forEach(category => {
      const matchesQuery = category.name.toLowerCase().includes(query.toLowerCase())
      const filteredChildren = category.children ? filterCategories(category.children, query) : []
      
      if (matchesQuery || filteredChildren.length > 0) {
        filtered.push({
          ...category,
          children: filteredChildren
        })
      }
    })

    return filtered
  }

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)
    const isSelected = selectedCategoryId === category.id

    return (
      <div key={category.id}>
        <div 
          className={`flex items-center py-2 px-3 rounded cursor-pointer hover:bg-gray-50 ${
            isSelected ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => setSelectedCategoryId(category.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(category.id)
              }}
              className="mr-2 p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-6 mr-2" />}
          
          <div className="mr-2">
            {hasChildren ? (
              isExpanded ? <FolderOpen className="w-4 h-4 text-blue-500" /> : <Folder className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-gray-400" />
            )}
          </div>
          
          <div className="flex-1">
            <span className={`text-sm ${isSelected ? 'font-medium text-blue-700' : 'text-gray-900'}`}>
              {category.name}
            </span>
            {category._count && (
              <span className="text-xs text-gray-500 ml-2">
                ({category._count.products} товаров)
              </span>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const handleConfirm = () => {
    if (selectedCategoryId) {
      const selectedCategory = categories.find(cat => cat.id === selectedCategoryId)
      if (selectedCategory) {
        onCategorySelect(selectedCategoryId, selectedCategory.name)
        onOpenChange(false)
        setSelectedCategoryId(null)
        setSearchQuery('')
      }
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setSelectedCategoryId(null)
    setSearchQuery('')
  }

  const categoryTree = buildCategoryTree(categories)
  const filteredCategories = filterCategories(categoryTree, searchQuery)

  // Автоматически разворачиваем категории при поиске
  React.useEffect(() => {
    if (searchQuery) {
      const expandAll = (categories: Category[]) => {
        categories.forEach(category => {
          if (category.children && category.children.length > 0) {
            setExpandedCategories(prev => new Set([...prev, category.id]))
            expandAll(category.children)
          }
        })
      }
      expandAll(filteredCategories)
    }
  }, [searchQuery, filteredCategories])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Поиск категорий..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Список категорий */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {filteredCategories.length > 0 ? (
              <div className="p-2 space-y-1">
                {filteredCategories.map(category => renderCategory(category))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                {searchQuery ? 'Категории не найдены' : 'Нет доступных категорий'}
              </div>
            )}
          </div>

          {/* Выбранная категория */}
          {selectedCategoryId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Label className="text-sm font-medium text-blue-900">Выбранная категория:</Label>
              <p className="text-sm text-blue-700 mt-1">
                {categories.find(cat => cat.id === selectedCategoryId)?.name}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Отмена
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedCategoryId}
            style={{ cursor: selectedCategoryId ? 'pointer' : 'not-allowed' }}
          >
            Переместить товары
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 