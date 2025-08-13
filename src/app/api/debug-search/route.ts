import { NextRequest, NextResponse } from 'next/server'
import { autoEuroService } from '../../../lib/autoeuro-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code') || 'WHT005437'
    const brand = searchParams.get('brand') || 'SEAT'

    console.log('🧪 Debug Search - параметры:', { code, brand })

    // Тестируем поиск товаров
    const searchResult = await autoEuroService.searchItems({
      code,
      brand,
      with_crosses: false,
      with_offers: true
    })

    console.log('📊 Debug Search - результат AutoEuro:', {
      success: searchResult.success,
      dataLength: searchResult.data?.length || 0,
      error: searchResult.error
    })

    // Формируем внешние предложения как в резолвере
    let externalOffers: any[] = []
    if (searchResult.success && searchResult.data) {
      externalOffers = searchResult.data.map(offer => ({
        offerKey: offer.offer_key,
        brand: offer.brand,
        code: offer.code,
        name: offer.name,
        price: parseFloat(offer.price.toString()),
        currency: offer.currency || 'RUB',
        deliveryTime: calculateDeliveryDays(offer.delivery_time || ''),
        deliveryTimeMax: calculateDeliveryDays(offer.delivery_time_max || ''),
        quantity: offer.amount || 0,
        warehouse: offer.warehouse_name || 'Внешний склад',
        supplier: 'AutoEuro',
        comment: '',
        weight: 0,
        volume: 0,
        canPurchase: true
      }))
    }

    console.log('🔍 Debug Search - обработанные предложения:', externalOffers.length)

    return NextResponse.json({
      success: true,
      params: { code, brand },
      autoEuroResult: {
        success: searchResult.success,
        dataCount: searchResult.data?.length || 0,
        error: searchResult.error
      },
      externalOffers: externalOffers.slice(0, 5),
      externalOffersCount: externalOffers.length
    })

  } catch (error) {
    console.error('❌ Debug Search - ошибка:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
}

// Функция расчета дней доставки (копия из резолвера)
const calculateDeliveryDays = (deliveryDateStr: string): number => {
  if (!deliveryDateStr) return 7

  try {
    const deliveryDate = new Date(deliveryDateStr)
    const today = new Date()
    const diffTime = deliveryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(1, diffDays)
  } catch (error) {
    console.error('Ошибка расчета дней доставки:', error)
    return 7
  }
} 