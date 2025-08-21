"use client"

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download
} from 'lucide-react'
import { IMPORT_PRODUCTS } from '@/lib/graphql/mutations'
import { toast } from 'sonner'

interface ImportProductsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId?: string
  onSuccess: () => void
}

interface ImportResult {
  success: number
  errors: string[]
  total: number
  warnings: string[]
}

export const ImportProductsModal = ({ open, onOpenChange, categoryId, onSuccess }: ImportProductsModalProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const [importProducts] = useMutation(IMPORT_PRODUCTS)

  // Сбрасываем состояние при закрытии модала
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFile(null)
      setReplaceExisting(false)
      setIsUploading(false)
      setUploadProgress(0)
      setImportResult(null)
    }
    onOpenChange(newOpen)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // Проверяем тип файла
    const fileName = selectedFile.name.toLowerCase()
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      toast.error('Поддерживаются только файлы CSV, XLS и XLSX')
      return
    }

    setFile(selectedFile)
    setImportResult(null)
  }

  const handleImport = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)
    setImportResult(null)

    try {
      // Читаем файл как base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Убираем префикс data:application/vnd.ms-excel;base64,
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Симуляция прогресса загрузки
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      // Выполняем импорт
      const result = await importProducts({
        variables: {
          input: {
            file: fileContent,
            categoryId,
            replaceExisting
          }
        }
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const importResult = result.data?.importProducts
      if (importResult) {
        setImportResult(importResult)

        if (importResult.success > 0) {
          toast.success(`Успешно импортировано ${importResult.success} товаров`)
          onSuccess()
        }
        
        if (importResult.errors.length > 0) {
          toast.error(`Ошибки при импорте: ${importResult.errors.length}`)
        }

        if (importResult.warnings.length > 0) {
          toast.warning(`Предупреждения: ${importResult.warnings.length}`)
        }
      }

    } catch (error) {
      console.error('Ошибка импорта:', error)
      toast.error('Ошибка при импорте файла')
      setImportResult({
        success: 0,
        errors: ['Ошибка при обработке файла'],
        total: 0,
        warnings: []
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadSampleFile = (format: 'excel' | 'csv' = 'excel') => {
    // Скачиваем пример файла с сервера
    const link = document.createElement('a')
    if (format === 'excel') {
      link.href = '/api/products/sample'
      link.download = 'sample_products_import.xlsx'
    } else {
      link.href = '/api/products/sample-csv'
      link.download = 'sample_products_import.csv'
    }
    link.click()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Импорт товаров</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Информация о формате */}
          <Alert>
            <FileText className="h-4 w-4" />
                         <AlertDescription>
               Поддерживаются файлы CSV, XLS и XLSX. Обязательные столбцы: Название. 
               Опциональные: Артикул, Описание, Цена опт, Цена розница, Остаток, Единица, Вес, Размеры.
             </AlertDescription>
          </Alert>

          {/* Кнопки скачивания примера */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={() => downloadSampleFile('excel')}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel пример
            </Button>
            <Button 
              variant="outline" 
              onClick={() => downloadSampleFile('csv')}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV пример
            </Button>
          </div>

          {/* Загрузка файла */}
          <div className="space-y-2">
            <Label htmlFor="file">Выберите файл для импорта</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>

          {/* Настройки импорта */}
          {file && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="replace"
                  checked={replaceExisting}
                  onCheckedChange={(checked) => setReplaceExisting(checked as boolean)}
                />
                <Label htmlFor="replace">
                  Заменять существующие товары (по артикулу)
                </Label>
              </div>

              {categoryId && (
                <Alert>
                  <AlertDescription>
                    Товары будут добавлены в выбранную категорию
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Прогресс загрузки */}
          {isUploading && (
            <div className="space-y-2">
              <Label>Прогресс импорта</Label>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-500">Обработка файла...</p>
            </div>
          )}

          {/* Результаты импорта */}
          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Успешно</p>
                    <p className="text-lg font-bold text-green-600">{importResult.success}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Ошибки</p>
                    <p className="text-lg font-bold text-red-600">{importResult.errors.length}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Предупреждения</p>
                    <p className="text-lg font-bold text-yellow-600">{importResult.warnings.length}</p>
                  </div>
                </div>
              </div>

              {/* Детали ошибок и предупреждений */}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-red-600">Ошибки:</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {importResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-yellow-600">Предупреждения:</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.warnings.map((warning, index) => (
                      <p key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                        {warning}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isUploading}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!file || isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Импорт...' : 'Импортировать'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 