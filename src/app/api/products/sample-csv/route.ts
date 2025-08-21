import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Создаем CSV пример в формате вашего файла
    const csvData = [
      'Код,Производитель,Артикул,Наименование,Остаток,Резерв,Доступно,Цена АвтоЕвро ООО НДС',
      '"OIL-001","CASTROL","OIL5W30-001","Масло моторное 5W-30 синтетическое 4л",50,5,45,1200',
      '"AF-002","MANN","FILTER-AIR-002","Фильтр воздушный для легковых автомобилей",25,3,22,650',
      '"BP-003","BREMBO","BRAKE-PAD-003","Тормозные колодки передние",15,2,13,1800',
      '"BAT-004","VARTA","BATTERY-60AH","Аккумулятор автомобильный 60Ah 12V",8,1,7,6500',
      '"SP-005","NGK","SPARK-PLUG-004","Свечи зажигания иридиевые комплект",100,10,90,480'
    ].join('\n')

    // Добавляем BOM для корректного отображения в Excel
    const csvWithBOM = '\uFEFF' + csvData

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sample_products_import.csv"',
      }
    })
  } catch (error) {
    console.error('Ошибка генерации CSV примера:', error)
    return NextResponse.json(
      { error: 'Не удалось сгенерировать CSV пример' },
      { status: 500 }
    )
  }
} 