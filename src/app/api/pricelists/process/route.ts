import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

// Функция для парсинга Excel файла
async function parseExcelFile(fileUrl: string) {
  try {
    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // Берем первый лист
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Преобразуем в JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    return data
  } catch (error) {
    console.error('Ошибка парсинга Excel:', error)
    throw error
  }
}

// Функция для поиска колонок по названиям (нечеткий поиск)
function findColumnIndex(headers: any[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map((h: any) =>
    String(h || '').toLowerCase().trim()
  )

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const header = normalizedHeaders[i]
    for (const name of possibleNames) {
      if (header.includes(name.toLowerCase())) {
        return i
      }
    }
  }

  return -1
}

// Функция для добавления лога
async function addLog(priceListId: string, message: string) {
  const timestamp = new Date().toLocaleTimeString('ru-RU')
  const logMessage = `[${timestamp}] ${message}\n`

  // processingLog - это String?, поэтому используем конкатенацию через raw SQL
  await prisma.$executeRaw`
    UPDATE price_lists
    SET "processingLog" = COALESCE("processingLog", '') || ${logMessage}
    WHERE id = ${priceListId}
  `
}

// Основная функция обработки прайслиста
async function processPriceList(priceListId: string) {
  try {
    // Обновляем статус на "processing"
    await prisma.priceList.update({
      where: { id: priceListId },
      data: {
        status: 'processing',
        processingLog: '🚀 Начало обработки прайслиста\n'
      }
    })

    const priceList = await prisma.priceList.findUnique({
      where: { id: priceListId },
      include: { supplier: true }
    })

    if (!priceList) {
      throw new Error('Прайслист не найден')
    }

    await addLog(priceListId, `📥 Загружаю файл: ${priceList.fileName}`)

    // Парсим Excel файл
    const data = await parseExcelFile(priceList.fileUrl)

    if (!data || data.length === 0) {
      throw new Error('Файл пустой или не удалось его прочитать')
    }

    await addLog(priceListId, `✅ Файл загружен, строк: ${data.length}`)

    // Ищем заголовки в файле (они могут быть не в первой строке)
    let headerRowIndex = -1
    let headers: any[] = []

    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i] as any[]
      const hasArticle = row.some((cell: any) => {
        const str = String(cell || '').toLowerCase()
        return str.includes('каталожный') || str.includes('номер') || str.includes('артикул')
      })

      if (hasArticle) {
        headerRowIndex = i
        headers = row
        break
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Не удалось найти строку с заголовками (Каталожный номер, Бренд, Описание и т.д.)')
    }

    await addLog(priceListId, `📋 Найдены заголовки в строке ${headerRowIndex + 1}`)

    // Определяем индексы колонок
    const articleIndex = findColumnIndex(headers, ['каталожный', 'номер', 'артикул'])
    const brandIndex = findColumnIndex(headers, ['бренд', 'производитель', 'brand'])
    const nameIndex = findColumnIndex(headers, ['описание', 'название', 'наименование', 'name'])
    const availabilityIndex = findColumnIndex(headers, ['наличие', 'availability', 'stock'])
    const priceIndex = findColumnIndex(headers, ['цена', 'price'])
    const multiplicityIndex = findColumnIndex(headers, ['кратность', 'multiplicity'])

    if (articleIndex === -1) {
      throw new Error('Не найдена колонка "Каталожный номер" или "Артикул"')
    }

    if (nameIndex === -1) {
      throw new Error('Не найдена колонка "Описание" или "Название"')
    }

    await addLog(priceListId, `🔍 Определены колонки: Артикул, Бренд, Название, ${priceIndex >= 0 ? 'Цена' : ''}`)

    // Удаляем старые записи этого прайслиста
    await addLog(priceListId, `🗑️  Удаляю старые записи прайслиста`)
    await prisma.priceListItem.deleteMany({
      where: { priceListId }
    })

    // Обрабатываем данные (пропускаем строки до и включая заголовки)
    const items: any[] = []

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i] as any[]

      const article = String(row[articleIndex] || '').trim()
      const name = String(row[nameIndex] || '').trim()

      // Пропускаем пустые строки
      if (!article || !name) {
        continue
      }

      const brand = brandIndex >= 0 ? String(row[brandIndex] || '').trim() : null
      const availability = availabilityIndex >= 0 ? String(row[availabilityIndex] || '').trim() : null
      const price = priceIndex >= 0 ? parseFloat(String(row[priceIndex] || '0')) : null
      const multiplicity = multiplicityIndex >= 0 ? parseInt(String(row[multiplicityIndex] || '1')) : null

      items.push({
        priceListId,
        article,
        brand: brand || null,
        name,
        availability: availability || null,
        price: price && !isNaN(price) ? price : null,
        multiplicity: multiplicity && !isNaN(multiplicity) ? multiplicity : null,
      })
    }

    await addLog(priceListId, `📦 Найдено ${items.length} товаров для импорта`)

    // Сохраняем все товары в базу (батчами по 1000)
    await addLog(priceListId, `💾 Начинаю сохранение в базу данных...`)
    const batchSize = 1000
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      await prisma.priceListItem.createMany({
        data: batch,
        skipDuplicates: true
      })
      const progress = Math.min(i + batchSize, items.length)
      await addLog(priceListId, `⏳ Сохранено ${progress} / ${items.length} товаров`)
    }

    // Обновляем прайслист - статус completed и количество товаров
    await addLog(priceListId, `✅ Обработка завершена успешно! Импортировано ${items.length} товаров`)

    await prisma.priceList.update({
      where: { id: priceListId },
      data: {
        status: 'completed',
        itemsCount: items.length,
        errorMessage: null
      }
    })

    return { success: true, itemsCount: items.length }

  } catch (error: any) {
    console.error('Ошибка обработки прайслиста:', error)

    // Обновляем статус на error
    await prisma.priceList.update({
      where: { id: priceListId },
      data: {
        status: 'error',
        errorMessage: error.message || 'Неизвестная ошибка'
      }
    })

    throw error
  }
}

// API endpoint
export async function POST(req: NextRequest) {
  try {
    const { priceListId } = await req.json()

    if (!priceListId) {
      return NextResponse.json(
        { error: 'priceListId обязателен' },
        { status: 400 }
      )
    }

    // Запускаем обработку в фоне (не блокируем ответ)
    processPriceList(priceListId).catch(error => {
      console.error('Ошибка фоновой обработки прайслиста:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Обработка прайслиста запущена'
    })

  } catch (error: any) {
    console.error('Ошибка API:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка обработки прайслиста' },
      { status: 500 }
    )
  }
}
