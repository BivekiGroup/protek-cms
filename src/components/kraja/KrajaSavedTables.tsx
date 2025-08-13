'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Trash2, 
  Eye,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { GET_CATEGORY_TABLES, DELETE_CATEGORY_TABLE } from '@/lib/graphql/queries'
import toast from 'react-hot-toast'

interface CategoryTable {
  tableName: string
  categoryId: string
  categoryType: string
  recordCount: number
}

interface KrajaSavedTablesProps {
  onViewTable: (categoryId: string, categoryType: string, tableName: string) => void
}

export const KrajaSavedTables = ({ onViewTable }: KrajaSavedTablesProps) => {
  const { data, loading, error, refetch } = useQuery(GET_CATEGORY_TABLES, {
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network'
  })

  const [deleteCategoryTable] = useMutation(DELETE_CATEGORY_TABLE, {
    onCompleted: () => {
      toast.success('✅ Таблица удалена')
      refetch()
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`)
    }
  })

  const tables: CategoryTable[] = data?.getCategoryTables || []

  const handleDeleteTable = async (categoryId: string, categoryType: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту таблицу? Все данные будут потеряны.')) {
      return
    }

    try {
      await deleteCategoryTable({
        variables: {
          categoryId,
          categoryType: categoryType.toUpperCase()
        }
      })
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const getCategoryTypeColor = (type: string) => {
    return type.toLowerCase() === 'partsindex' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  const getCategoryTypeLabel = (type: string) => {
    return type.toLowerCase() === 'partsindex' ? 'PartsIndex' : 'PartsAPI'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-600">Загрузка сохраненных таблиц...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-red-600">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>Ошибка загрузки: {error.message}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Сохраненные таблицы
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tables.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">Нет сохраненных таблиц</p>
            <p className="text-sm">Используйте кнопки &quot;Сохранить&quot; в категориях для создания таблиц</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tables.map((table) => (
              <div
                key={table.tableName}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Database className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{table.tableName}</h4>
                      <Badge className={getCategoryTypeColor(table.categoryType)}>
                        {getCategoryTypeLabel(table.categoryType)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>ID: {table.categoryId}</span>
                      <Badge variant="secondary" className="text-xs">
                        {table.recordCount.toLocaleString()} записей
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewTable(table.categoryId, table.categoryType, table.tableName)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Просмотреть
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTable(table.categoryId, table.categoryType)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 