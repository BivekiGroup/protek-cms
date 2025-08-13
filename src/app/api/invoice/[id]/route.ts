import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PDFDocument from 'pdfkit'

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
    
    // Извлекаем clientId из токена формата client_{id}
    let clientId: string | null = null
    
    if (token.startsWith('client_')) {
      clientId = token.substring(7)
    } else {
      // Для обычных JWT токенов - проверяем, это менеджер или админ
      const payload = verifyToken(token)
      if (!payload) {
        return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
      }
      // Менеджеры и админы могут скачивать счета любых клиентов
      // В этом случае clientId останется null и мы не будем фильтровать по clientId
    }

    // Ищем счет
    const whereCondition: any = { id: id }
    
    // Если это клиент (clientId есть), то фильтруем по clientId
    if (clientId) {
      whereCondition.contract = {
        clientId: clientId
      }
    }

    const invoice = await prisma.balanceInvoice.findFirst({
      where: whereCondition,
      include: {
        contract: {
          include: {
            client: {
              include: {
                legalEntities: true
              }
            }
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Счет не найден или нет доступа' }, { status: 404 })
    }

    // Создаем PDF
    const doc = new PDFDocument({ margin: 50 })
    
    // Устанавливаем заголовки для скачивания
    const filename = `invoice-${invoice.invoiceNumber}.pdf`
    
    // Буфер для накопления PDF данных
    const chunks: Buffer[] = []
    
    doc.on('data', (chunk) => {
      chunks.push(chunk)
    })

    return new Promise<NextResponse>((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        
        const response = new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length.toString(),
          }
        })
        
        resolve(response)
      })

      // Генерируем содержимое PDF
      generateInvoicePDF(doc, invoice)
      doc.end()
    })

  } catch (error) {
    console.error('Ошибка создания PDF счета:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

function generateInvoicePDF(doc: InstanceType<typeof PDFDocument>, invoice: any) {
  const client = invoice.contract.client
  const legalEntity = client.legalEntities?.[0]
  
  // Заголовок
  doc.fontSize(20).font('Helvetica-Bold')
  doc.text(`Счет на оплату № ${invoice.invoiceNumber}`, 50, 50)
  
  // Дата
  doc.fontSize(12).font('Helvetica')
  doc.text(`от ${new Date(invoice.createdAt).toLocaleDateString('ru-RU')}`, 50, 80)
  
  // Информация о плательщике
  doc.fontSize(14).font('Helvetica-Bold')
  doc.text('Плательщик:', 50, 120)
  
  doc.fontSize(12).font('Helvetica')
  let yPos = 140
  
  if (legalEntity) {
    doc.text(`${legalEntity.shortName || legalEntity.fullName}`, 50, yPos)
    yPos += 20
    doc.text(`ИНН: ${legalEntity.inn}`, 50, yPos)
    yPos += 20
    if (legalEntity.legalAddress) {
      doc.text(`Адрес: ${legalEntity.legalAddress}`, 50, yPos)
      yPos += 20
    }
  } else {
    doc.text(`${client.name}`, 50, yPos)
    yPos += 20
    doc.text(`Телефон: ${client.phone}`, 50, yPos)
    yPos += 20
  }
  
  // Договор
  yPos += 20
  doc.fontSize(14).font('Helvetica-Bold')
  doc.text('Договор:', 50, yPos)
  yPos += 20
  
  doc.fontSize(12).font('Helvetica')
  doc.text(`№ ${invoice.contract.contractNumber}`, 50, yPos)
  yPos += 40
  
  // Таблица с суммой
  doc.fontSize(14).font('Helvetica-Bold')
  doc.text('К доплате:', 50, yPos)
  
  yPos += 30
  doc.fontSize(16).font('Helvetica-Bold')
  doc.text(`${invoice.amount.toLocaleString('ru-RU')} ₽`, 50, yPos)
  
  yPos += 40
  doc.fontSize(12).font('Helvetica')
  doc.text('Назначение платежа: Пополнение баланса по договору', 50, yPos)
  
  // Подпись
  yPos += 80
  doc.fontSize(12).font('Helvetica')
  doc.text('ООО "ПРОТЕКАВТО"', 50, yPos)
  yPos += 20
  doc.text('Директор: ________________', 50, yPos)
  
  // Печать
  yPos += 40
  doc.text('М.П.', 50, yPos)
} 