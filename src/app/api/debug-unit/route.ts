import { NextRequest, NextResponse } from 'next/server'
import { laximoUnitService } from '@/lib/laximo-service'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const catalogCode = searchParams.get('catalogCode') || 'KIA202404'
  const vehicleId = searchParams.get('vehicleId') || '2095869513'
  const unitId = searchParams.get('unitId') || '1842820926'
  const ssd = searchParams.get('ssd') || '$*KwGhjK205_fnwvL-5sH4hIPO7Nv15cSn9L68mOiw9rapsNDZ6Oj64LCvtt2w6OmfqrHnxKf35-rV7Oi3-qmwpqWgp6TV-_X67uzD8fvEp_S-vJjosPa2qbDH0p-WiNuip6Wxvrfy6P762NvUpqOgoaf-5vSx_7eusdqlxP6P7KWj07a_sOa18Oaesb634rGot83z8JuhpqTV0d_Hpf7x4aWkt-ntzdXzn6aLp6PEx_DNzLa0m4fTqqaio6ulpf_wpszi5uDTxNDfg4eU1tvR0d3GxsOYjZbU7Mrk4OTVzfPwm6GmpNXR38el_vHhpaTr_f71wOWmkurT8fTgvKO63OWWncbAxdyjoKS4-fXrpqPXpaIAAAAADaPhQw==$'
  
  console.log('🔍 Debug Unit API - Параметры:', { catalogCode, vehicleId, unitId, ssd: ssd ? `${ssd.substring(0, 30)}...` : 'отсутствует' })

  try {
    const results: any = {
      testParams: { catalogCode, vehicleId, unitId, ssdLength: ssd?.length },
      timestamp: new Date().toISOString()
    }

    // 1. Тестируем GetUnitInfo
    console.log('🔍 Тестируем GetUnitInfo...')
    const unitInfo = await laximoUnitService.getUnitInfo(catalogCode, vehicleId, unitId, ssd)
    results.unitInfo = {
      success: !!unitInfo,
      data: unitInfo,
      hasImage: !!(unitInfo?.imageurl || unitInfo?.largeimageurl),
      attributesCount: unitInfo?.attributes?.length || 0
    }

    // 2. Тестируем ListDetailByUnit  
    console.log('🔍 Тестируем ListDetailByUnit...')
    const unitDetails = await laximoUnitService.getUnitDetails(catalogCode, vehicleId, unitId, ssd)
    results.unitDetails = {
      success: Array.isArray(unitDetails),
      detailsCount: unitDetails?.length || 0,
      data: unitDetails || [],
      sampleDetail: unitDetails?.[0] || null
    }

    // 3. Тестируем ListImageMapByUnit
    console.log('🔍 Тестируем ListImageMapByUnit...')
    const imageMap = await laximoUnitService.getUnitImageMap(catalogCode, vehicleId, unitId, ssd)
    results.imageMap = {
      success: !!imageMap,
      coordinatesCount: imageMap?.coordinates?.length || 0,
      data: imageMap,
      sampleCoordinate: imageMap?.coordinates?.[0] || null
    }

    // Суммарная статистика
    results.summary = {
      hasUnitInfo: !!unitInfo,
      hasImage: !!(unitInfo?.imageurl || unitInfo?.largeimageurl),
      detailsCount: unitDetails?.length || 0,
      coordinatesCount: imageMap?.coordinates?.length || 0,
      allDataPresent: !!unitInfo && (unitDetails?.length || 0) > 0 && !!imageMap
    }

    console.log('✅ Debug Unit API результаты:', results.summary)

    return NextResponse.json(results)
  } catch (error) {
    console.error('❌ Ошибка в Debug Unit API:', error)
    return NextResponse.json({
      error: 'Ошибка тестирования API узлов',
      details: error instanceof Error ? error.message : String(error),
      testParams: { catalogCode, vehicleId, unitId, ssdLength: ssd?.length }
    }, { status: 500 })
  }     
} 