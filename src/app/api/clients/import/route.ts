import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface ImportResult {
  success: number
  errors: string[]
  total: number
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      )
    }

    // Проверяем тип файла
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Поддерживаются только CSV файлы' },
        { status: 400 }
      )
    }

    // Читаем содержимое файла
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'Файл должен содержать заголовки и хотя бы одну строку данных' },
        { status: 400 }
      )
    }

    // Парсим заголовки
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
    const dataLines = lines.slice(1)

    const result: ImportResult = {
      success: 0,
      errors: [],
      total: dataLines.length
    }

    // Обрабатываем каждую строку
    for (let i = 0; i < dataLines.length; i++) {
      const lineNumber = i + 2 // +2 потому что начинаем с 1 и пропускаем заголовок
      
      try {
        const values = dataLines[i].split(',').map(v => v.replace(/"/g, '').trim())
        
        if (values.length !== headers.length) {
          result.errors.push(`Строка ${lineNumber}: неверное количество колонок`)
          continue
        }

        // Создаем объект из заголовков и значений
        const rowData: Record<string, string> = {}
        headers.forEach((header, index) => {
          rowData[header] = values[index]
        })

        // Валидация обязательных полей
        if (!rowData.name || !rowData.phone) {
          result.errors.push(`Строка ${lineNumber}: отсутствуют обязательные поля (name, phone)`)
          continue
        }

        // Проверяем тип клиента
        const clientType = rowData.type?.toUpperCase()
        if (clientType && !['INDIVIDUAL', 'LEGAL_ENTITY'].includes(clientType)) {
          result.errors.push(`Строка ${lineNumber}: неверный тип клиента (должен быть INDIVIDUAL или LEGAL_ENTITY)`)
          continue
        }

        // Генерируем номер клиента
        const clientCount = await prisma.client.count()
        const clientNumber = `CL${(clientCount + 1).toString().padStart(6, '0')}`

        // Создаем клиента
        await prisma.client.create({
          data: {
            clientNumber,
            name: rowData.name,
            email: rowData.email || null,
            phone: rowData.phone,
            type: (clientType as 'INDIVIDUAL' | 'LEGAL_ENTITY') || 'INDIVIDUAL',
            markup: rowData.markup ? parseFloat(rowData.markup) : null,
            isConfirmed: rowData.isConfirmed === 'true' || rowData.isConfirmed === 'Да',
            comment: rowData.notes || null
          }
        })

        result.success++
      } catch (error) {
        console.error(`Ошибка обработки строки ${lineNumber}:`, error)
        result.errors.push(`Строка ${lineNumber}: ошибка создания клиента`)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Ошибка импорта клиентов:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
} 