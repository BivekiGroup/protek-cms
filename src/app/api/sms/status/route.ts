import { NextRequest, NextResponse } from 'next/server'
import { smsService } from '../../../../lib/sms-service'
import { smsCodeStore } from '../../../../lib/sms-code-store'

export async function GET() {
  try {
    // Проверяем конфигурацию SMS сервиса
    const hasConfig = !!(process.env.BEELINE_SMS_USER && process.env.BEELINE_SMS_PASS)
    
    if (!hasConfig) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'SMS сервис не настроен. Добавьте BEELINE_SMS_USER и BEELINE_SMS_PASS в переменные окружения.',
        hasConfig: false
      })
    }

    // Проверяем баланс SMS сервиса
    const balanceResult = await smsService.getBalance()
    
    // Получаем статистику кодов
    const stats = smsCodeStore.getStats()

    return NextResponse.json({
      status: 'configured',
      message: 'SMS сервис настроен и готов к работе',
      hasConfig: true,
      balance: balanceResult.balance || null,
      balanceError: balanceResult.error || null,
      codeStats: stats,
      config: {
        user: process.env.BEELINE_SMS_USER || 'не указан',
        sender: process.env.BEELINE_SMS_SENDER || 'ProtekAuto',
        hasPassword: !!process.env.BEELINE_SMS_PASS
      }
    })
  } catch (error) {
    console.error('Ошибка проверки статуса SMS:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Ошибка при проверке статуса SMS сервиса',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
}

// Тестовая отправка SMS (только для разработки)
export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        error: 'Тестовая отправка недоступна в продакшене'
      }, { status: 403 })
    }

    const { phone, message } = await request.json()

    if (!phone || !message) {
      return NextResponse.json({
        error: 'Требуются поля phone и message'
      }, { status: 400 })
    }

    const result = await smsService.sendSMS({
      message,
      target: phone,
      autotrimtext: true,
      post_id: `test_${Date.now()}`
    })

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      raw: result.raw
    })
  } catch (error) {
    console.error('Ошибка тестовой отправки SMS:', error)
    return NextResponse.json({
      error: 'Ошибка при отправке тестового SMS',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
} 