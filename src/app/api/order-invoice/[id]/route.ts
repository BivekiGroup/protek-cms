import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
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
    let clientId: string | null = null

    if (token.startsWith('client_')) {
      // Клиентский токен из localStorage - содержит clientId
      const tokenClientId = token.substring(7)
      console.log('🔍 Client token detected, clientId:', tokenClientId)
      clientId = tokenClientId
    } else {
      // Для обычных JWT токенов - проверяем, это менеджер или админ
      const payload = verifyToken(token)
      if (!payload) {
        return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
      }
      console.log('🔍 JWT token verified, role:', payload.role)
      // Менеджеры и админы могут скачивать счета любых клиентов
      // Если это клиент, получаем его clientId из токена
      if (payload.role === 'client' && 'clientId' in payload) {
        clientId = payload.clientId as string
      }
    }

    // Ищем заказ
    const whereCondition: any = { id: id }

    // Если это клиент (не менеджер/админ), фильтруем по clientId
    if (clientId) {
      whereCondition.clientId = clientId
      console.log('🔍 Filtering order by clientId:', clientId)
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

    // Проверяем, нужно ли генерировать PDF
    let pdfBuffer: Buffer

    if (order.invoiceUrl) {
      console.log('✅ Invoice already exists, fetching from S3:', order.invoiceUrl)
      // Если счет уже существует, скачиваем его из S3
      const response = await fetch(order.invoiceUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch existing invoice from S3: ${response.status}`)
      }
      pdfBuffer = Buffer.from(await response.arrayBuffer())
    } else {
      console.log('📄 Generating new PDF invoice for order:', order.orderNumber)

      // Генерируем PDF используя PDFKit
      pdfBuffer = await generateInvoicePDF(order as any)

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
    }

    // Возвращаем PDF напрямую вместо редиректа (чтобы избежать CORS проблем)
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${order.orderNumber}.pdf"`,
        'Access-Control-Allow-Origin': process.env.FRONTEND_ORIGIN || 'http://localhost:3001',
      }
    })

  } catch (error) {
    console.error('Ошибка создания PDF счета:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
