"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'
import { 
  Upload, 
  Download, 
  FileText, 
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface ImportClientsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ImportResult {
  success: number
  errors: string[]
  total: number
}

export const ImportClientsModal = ({ isOpen, onClose }: ImportClientsModalProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    setIsUploading(false)
    setUploadProgress(0)
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  const downloadTemplate = () => {
    // Создаем CSV шаблон
    const csvContent = [
      'name,email,phone,type,markup,isConfirmed,notes',
      'Иван Иванов,ivan@example.com,+7 (999) 123-45-67,INDIVIDUAL,5.5,true,Постоянный клиент',
      'ООО "Рога и Копыта",company@example.com,+7 (999) 987-65-43,LEGAL_ENTITY,10.0,false,Новый корпоративный клиент'
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'clients_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Шаблон файла скачан')
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем тип файла
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error('Поддерживаются только файлы CSV и XLSX')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

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

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла')
      }

      const result = await response.json()
      setImportResult(result)

      if (result.success > 0) {
        toast.success(`Успешно импортировано ${result.success} клиентов`)
      }
      
      if (result.errors.length > 0) {
        toast.error(`Ошибки при импорте: ${result.errors.length}`)
      }

    } catch (error) {
      console.error('Ошибка импорта:', error)
      toast.error('Ошибка при импорте файла')
      setImportResult({
        success: 0,
        errors: ['Ошибка при обработке файла'],
        total: 0
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Импорт клиентов</DialogTitle>
          <DialogDescription>
            Загрузите файл CSV или XLSX с данными клиентов для массового импорта.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Инструкции */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <div className="space-y-2">
                <p className="font-semibold">Формат файла</p>
                <p>Файл должен содержать следующие колонки:</p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li><strong>name</strong> - Имя клиента (обязательно)</li>
                  <li><strong>email</strong> - Email адрес</li>
                  <li><strong>phone</strong> - Номер телефона (обязательно)</li>
                  <li><strong>type</strong> - Тип: INDIVIDUAL или LEGAL_ENTITY</li>
                  <li><strong>markup</strong> - Наценка в процентах (число)</li>
                  <li><strong>isConfirmed</strong> - Подтвержден: true или false</li>
                  <li><strong>notes</strong> - Заметки</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Скачать шаблон */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Скачать шаблон файла
            </Button>
          </div>

          {/* Загрузка файла */}
          <div className="space-y-4">
            <Label>Выберите файл для импорта</Label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Нажмите для выбора</span> или перетащите файл
                  </p>
                  <p className="text-xs text-gray-500">CSV или XLSX (макс. 10MB)</p>
                </div>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* Прогресс загрузки */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Загрузка и обработка файла...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Результат импорта */}
          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {importResult.success > 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <h4 className="font-semibold">Результат импорта</h4>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.success}
                  </div>
                  <div className="text-sm text-green-700">Успешно</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.errors.length}
                  </div>
                  <div className="text-sm text-red-700">Ошибки</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {importResult.total}
                  </div>
                  <div className="text-sm text-blue-700">Всего</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="mt-2">
                      <p className="font-semibold mb-2">Ошибки при импорте</p>
                      <div className="max-h-32 overflow-y-auto">
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            {importResult ? 'Закрыть' : 'Отмена'}
          </Button>
          {importResult && importResult.success > 0 && (
            <Button onClick={handleClose}>
              Готово
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 