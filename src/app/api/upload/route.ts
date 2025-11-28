import { NextRequest, NextResponse } from 'next/server'
import { uploadFile, generateFileKey } from '@/lib/s3'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const prefix = formData.get('prefix') as string || 'uploads'

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      )
    }

    // Проверяем размер файла (для прайслистов - 50MB, для остальных - 10MB)
    const maxSize = prefix === 'pricelists' ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      const maxSizeMB = prefix === 'pricelists' ? '50MB' : '10MB'
      return NextResponse.json(
        { error: `Файл слишком большой. Максимальный размер: ${maxSizeMB}` },
        { status: 400 }
      )
    }

    // Проверяем тип файла
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
      'application/json',
      'application/zip',
      'application/octet-stream'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Неподдерживаемый тип файла' },
        { status: 400 }
      )
    }

    // Генерируем уникальный ключ для файла
    const key = generateFileKey(file.name, prefix)

    // Загружаем файл в S3
    const result = await uploadFile({
      file,
      key,
      contentType: file.type,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Ошибка загрузки файла:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки файла' },
      { status: 500 }
    )
  }
} 
