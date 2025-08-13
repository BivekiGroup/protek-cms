import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    // Создаем пример данных для импорта в формате вашего файла
    const sampleData = [
      ['Код', 'Производитель', 'Артикул', 'Наименование', 'Остаток', 'Резерв', 'Доступно', 'Цена АвтоЕвро ООО НДС'],
      ['OIL-001', 'CASTROL', 'OIL5W30-001', 'Масло моторное 5W-30 синтетическое 4л', 50, 5, 45, 1200],
      ['AF-002', 'MANN', 'FILTER-AIR-002', 'Фильтр воздушный для легковых автомобилей', 25, 3, 22, 650],
      ['BP-003', 'BREMBO', 'BRAKE-PAD-003', 'Тормозные колодки передние', 15, 2, 13, 1800],
      ['BAT-004', 'VARTA', 'BATTERY-60AH', 'Аккумулятор автомобильный 60Ah 12V', 8, 1, 7, 6500],
      ['SP-005', 'NGK', 'SPARK-PLUG-004', 'Свечи зажигания иридиевые комплект', 100, 10, 90, 480]
    ]

    // Создаем workbook и worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(sampleData)

    // Устанавливаем ширину колонок
    worksheet['!cols'] = [
      { width: 12 }, // Код
      { width: 15 }, // Производитель
      { width: 15 }, // Артикул
      { width: 40 }, // Наименование
      { width: 10 }, // Остаток
      { width: 10 }, // Резерв
      { width: 10 }, // Доступно
      { width: 20 }  // Цена АвтоЕвро ООО НДС
    ]

    // Добавляем worksheet в workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Товары')

    // Генерируем Excel файл как buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Возвращаем файл с правильными заголовками
    const response = new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="sample_products_import.xlsx"',
        'Content-Length': excelBuffer.length.toString()
      }
    })
    
    return response
  } catch (error) {
    console.error('Ошибка генерации примера файла:', error)
    return NextResponse.json(
      { error: 'Не удалось сгенерировать пример файла' },
      { status: 500 }
    )
  }
} 