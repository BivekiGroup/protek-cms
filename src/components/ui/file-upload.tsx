"use client"

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onUpload: (url: string) => void
  accept?: string
  maxSize?: number // в байтах
  className?: string
  disabled?: boolean
}

export const FileUpload = ({ 
  onUpload, 
  accept = "image/*", 
  maxSize = 10 * 1024 * 1024, // 10MB по умолчанию
  className,
  disabled = false
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null)
    setSuccess(null)

    // Проверка размера файла
    if (file.size > maxSize) {
      setError(`Файл слишком большой. Максимальный размер: ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

    // Проверка типа файла для изображений
    if (accept.includes('image') && !file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение')
      return
    }

    // Создаем preview для изображений
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }

    // Загружаем файл
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('prefix', 'avatars') // Для аватаров

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка загрузки файла')
      }

      setSuccess('Файл успешно загружен!')
      onUpload(result.data.url)
      
      // Очищаем success через 3 секунды
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      setError(error instanceof Error ? error.message : 'Ошибка загрузки файла')
      setPreview(null)
    } finally {
      setIsUploading(false)
    }
  }, [accept, maxSize, onUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [disabled, handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const clearPreview = useCallback(() => {
    setPreview(null)
    setError(null)
    setSuccess(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drag & Drop Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-gray-300",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!disabled ? handleButtonClick : undefined}
      >
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-gray-600">Загрузка файла...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Нажмите для выбора файла или перетащите сюда
                </p>
                <p className="text-xs text-gray-500">
                  {accept.includes('image') ? 'PNG, JPG, GIF до' : 'Файлы до'} {Math.round(maxSize / 1024 / 1024)}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="relative">
          <Label>Предварительный просмотр</Label>
          <div className="relative mt-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="h-32 w-32 object-cover rounded-lg border"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={clearPreview}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Manual Upload Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className="w-full"
      >
        <ImageIcon className="mr-2 h-4 w-4" />
        {isUploading ? 'Загрузка...' : 'Выбрать файл'}
      </Button>
    </div>
  )
} 