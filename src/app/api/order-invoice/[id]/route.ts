import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import InvoicePDF from '@/components/invoice/InvoicePDF'
import { uploadBuffer } from '@/lib/s3'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Проверяем авторизацию
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Токен авторизации не предоставлен' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Проверяем тип токена
    let isPublicAccess = false
    let clientId: string | null = null

    if (token.startsWith('client_')) {
      // Временный публичный доступ - токен содержит orderId
      const tokenOrderId = token.substring(7)
      // Проверяем, что orderId в токене совпадает с запрашиваемым
      if (tokenOrderId !== id) {
        return NextResponse.json({ error: 'Недействительный токен доступа' }, { status: 403 })
      }
      isPublicAccess = true
    } else {
      // Для обычных JWT токенов - проверяем, это менеджер или админ
      const payload = verifyToken(token)
      if (!payload) {
        return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
      }
      // Менеджеры и админы могут скачивать счета любых клиентов
      // Если это клиент, получаем его clientId из токена
      if (payload.role === 'client' && payload.clientId) {
        clientId = payload.clientId
      }
    }

    // Ищем заказ
    const whereCondition: any = { id: id }

    // Если это авторизованный клиент (не публичный доступ), фильтруем по clientId
    if (clientId && !isPublicAccess) {
      whereCondition.clientId = clientId
    }

    const order = await prisma.order.findFirst({
      where: whereCondition,
      include: {
        client: {
          include: {
            legalEntities: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    })

    console.log('📋 Order found:', {
      id: order?.id,
      paymentMethod: order?.paymentMethod,
      itemsCount: order?.items?.length,
      invoiceUrl: order?.invoiceUrl
    })

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден или нет доступа' }, { status: 404 })
    }

    // Проверяем, что способ оплаты - invoice
    if (order.paymentMethod !== 'invoice') {
      console.log('❌ Payment method mismatch:', order.paymentMethod)
      return NextResponse.json({ error: 'Счет доступен только для заказов с оплатой по счету' }, { status: 400 })
    }

    // Если счет уже был сгенерирован, возвращаем его URL
    if (order.invoiceUrl) {
      console.log('✅ Invoice already exists, redirecting to:', order.invoiceUrl)
      return NextResponse.redirect(order.invoiceUrl)
    }

    console.log('📄 Generating new PDF invoice for order:', order.orderNumber)

    // Генерируем PDF используя @react-pdf/renderer
    const pdfBuffer = await renderToBuffer(React.createElement(InvoicePDF, { order }))

    // Загружаем PDF в S3
    const key = `invoices/${order.orderNumber}-${Date.now()}.pdf`
    const uploadResult = await uploadBuffer(pdfBuffer, key, 'application/pdf')

    console.log('☁️ PDF uploaded to S3:', uploadResult.url)

    // Сохраняем URL счета в базу данных
    await prisma.order.update({
      where: { id: order.id },
      data: { invoiceUrl: uploadResult.url }
    })

    console.log('✅ Invoice URL saved to database')

    // Перенаправляем на URL в S3
    return NextResponse.redirect(uploadResult.url)

  } catch (error) {
    console.error('Ошибка создания PDF счета:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
