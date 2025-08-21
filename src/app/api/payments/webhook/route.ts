import { NextRequest, NextResponse } from 'next/server'
import { yooKassaService } from '@/lib/yookassa-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Получаем тело запроса как текст для проверки подписи
    const body = await request.text()
    
    // Получаем подпись из заголовков
    const signature = request.headers.get('x-yookassa-signature')
    
    if (!signature) {
      console.error('Webhook: отсутствует подпись')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Проверяем подпись
    const isValidSignature = yooKassaService.verifyWebhookSignature(body, signature)
    
    if (!isValidSignature) {
      console.error('Webhook: неверная подпись')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Парсим данные webhook'а
    const webhookData = yooKassaService.parseWebhookPayload(body)
    
    if (!webhookData) {
      console.error('Webhook: не удалось распарсить данные')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    console.log('Webhook получен:', {
      type: webhookData.type,
      event: webhookData.event,
      paymentId: webhookData.object.id,
      status: webhookData.object.status
    })

    // Обрабатываем событие
    if (webhookData.type === 'notification') {
      await handlePaymentNotification(webhookData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ошибка обработки webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handlePaymentNotification(webhookData: any) {
  const { event, object: payment } = webhookData
  
  try {
    // Находим платеж в нашей базе данных
    const existingPayment = await prisma.payment.findUnique({
      where: { yookassaPaymentId: payment.id },
      include: {
        order: true
      }
    })

    if (!existingPayment) {
      console.error(`Платеж ${payment.id} не найден в базе данных`)
      return
    }

    // Обновляем статус платежа в зависимости от события
    let newStatus: string
    const updateData: any = {
      status: payment.status.toUpperCase(),
      updatedAt: new Date()
    }

    switch (event) {
      case 'payment.succeeded':
        newStatus = 'SUCCEEDED'
        updateData.paidAt = new Date()
        break
      case 'payment.canceled':
        newStatus = 'CANCELED'
        updateData.canceledAt = new Date()
        break
      case 'payment.waiting_for_capture':
        newStatus = 'WAITING_FOR_CAPTURE'
        break
      default:
        newStatus = payment.status.toUpperCase()
    }

    updateData.status = newStatus

    // Обновляем платеж
    const updatedPayment = await prisma.payment.update({
      where: { id: existingPayment.id },
      data: updateData
    })

    console.log(`Платеж ${payment.id} обновлен:`, {
      oldStatus: existingPayment.status,
      newStatus: updatedPayment.status,
      event
    })

    // Если платеж успешен, обновляем статус заказа
    if (event === 'payment.succeeded') {
      await prisma.order.update({
        where: { id: existingPayment.orderId },
        data: { 
          status: 'PAID',
          updatedAt: new Date()
        }
      })

      console.log(`Заказ ${existingPayment.orderId} помечен как оплаченный`)
    }

    // Если платеж отменен, обновляем статус заказа
    if (event === 'payment.canceled') {
      await prisma.order.update({
        where: { id: existingPayment.orderId },
        data: { 
          status: 'CANCELED',
          updatedAt: new Date()
        }
      })

      console.log(`Заказ ${existingPayment.orderId} отменен`)
    }

  } catch (error) {
    console.error('Ошибка обработки уведомления о платеже:', error)
    throw error
  }
} 