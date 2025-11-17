import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import * as QRCode from 'qrcode'
import * as fs from 'fs'
import * as path from 'path'

interface OrderItem {
  id: string
  name: string
  brand?: string | null
  article?: string | null
  quantity: number
  price: number
  totalPrice: number
}

interface Order {
  id: string
  orderNumber: string
  createdAt: Date | string
  finalAmount: number
  currency?: string
  items: OrderItem[]
  client?: {
    name?: string | null
    legalEntities?: Array<{
      shortName?: string | null
      fullName?: string | null
      inn?: string | null
      kpp?: string | null
      legalAddress?: string | null
    }> | null
  } | null
  clientName?: string | null
  clientPhone?: string | null
  clientEmail?: string | null
}

// Реквизиты компании
const COMPANY_INFO = {
  fullName: 'Общество с ограниченной ответственностью «ПРОТЕК»',
  shortName: 'ООО «ПРОТЕК»',
  legalAddress: '141804, Московская обл., г. Дмитров, ул. Чекистская 6, комната 4',
  postalAddress: '125373, г. Москва, Походный пр-д, дом 4 корп. 1, офис 211',
  inn: '5007117840',
  kpp: '500701001',
  ogrn: '1225000146282',
  okpo: '93202535',
  oktmo: '46715000001',
  account: '40702810238000009702',
  corrAccount: '30101810400000000225',
  bik: '044525225',
  bank: 'ПАО СБЕРБАНК г. Москва',
  director: 'Попов Александр Сергеевич',
  phone: '+74952602060'
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' ₽'
}

// Генерация данных для QR-кода оплаты по стандарту ST00012
function generatePaymentQRData(order: Order): string {
  const paymentData = [
    'ST00012',
    `Name=${COMPANY_INFO.shortName}`,
    `PersonalAcc=${COMPANY_INFO.account}`,
    `BankName=${COMPANY_INFO.bank}`,
    `BIC=${COMPANY_INFO.bik}`,
    `CorrespAcc=${COMPANY_INFO.corrAccount}`,
    `Purpose=Оплата по счёту ${order.orderNumber} от ${formatDate(order.createdAt)} за автозапчасти`,
    `Sum=${(order.finalAmount * 100).toFixed(0)}`,
    `PayeeINN=${COMPANY_INFO.inn}`,
    `KPP=${COMPANY_INFO.kpp}`
  ].join('|')

  return paymentData
}

export async function generateInvoicePDF(order: Order): Promise<Buffer> {
  // Создаем новый PDF документ
  const pdfDoc = await PDFDocument.create()

  // Регистрируем fontkit для поддержки TrueType шрифтов
  const fontkitModule = await import('@pdf-lib/fontkit').then(m => m.default || m)
  pdfDoc.registerFontkit(fontkitModule)

  // Загружаем шрифт с поддержкой кириллицы из локальных файлов
  const publicDir = path.join(process.cwd(), 'public', 'fonts')
  const fontBytes = fs.readFileSync(path.join(publicDir, 'Roboto-Regular.ttf'))
  const fontBoldBytes = fs.readFileSync(path.join(publicDir, 'Roboto-Bold.ttf'))

  const customFont = await pdfDoc.embedFont(fontBytes)
  const customFontBold = await pdfDoc.embedFont(fontBoldBytes)

  // Добавляем страницу A4
  const page = pdfDoc.addPage([595.28, 841.89]) // A4 size in points
  const { width, height } = page.getSize()

  // Цвета
  const blackColor = rgb(0, 0, 0)
  const redColor = rgb(0.925, 0.11, 0.141) // #EC1C24
  const grayColor = rgb(0.4, 0.4, 0.4)

  let yPosition = height - 50
  const leftMargin = 50
  const rightMargin = width - 50

  // Функция для рисования текста
  const drawText = (text: string, x: number, y: number, options: any = {}) => {
    page.drawText(text, {
      x,
      y,
      size: options.size || 10,
      font: options.bold ? customFontBold : customFont,
      color: options.color || blackColor,
      ...options
    })
  }

  // === ШАПКА ===
  drawText(COMPANY_INFO.shortName, leftMargin, yPosition, { size: 16, bold: true, color: redColor })
  yPosition -= 20

  drawText(`ИНН: ${COMPANY_INFO.inn} / КПП: ${COMPANY_INFO.kpp}`, leftMargin, yPosition, { size: 9 })
  yPosition -= 15
  drawText(COMPANY_INFO.postalAddress, leftMargin, yPosition, { size: 9 })
  yPosition -= 15
  drawText(`Тел: ${COMPANY_INFO.phone}`, leftMargin, yPosition, { size: 9 })
  yPosition -= 30

  // === ЗАГОЛОВОК ===
  const titleText = `Счёт на оплату № ${order.orderNumber}`
  const titleWidth = customFontBold.widthOfTextAtSize(titleText, 18)
  drawText(titleText, (width - titleWidth) / 2, yPosition, { size: 18, bold: true })
  yPosition -= 20

  const dateText = `от ${formatDate(order.createdAt)}`
  const dateWidth = customFont.widthOfTextAtSize(dateText, 12)
  drawText(dateText, (width - dateWidth) / 2, yPosition, { size: 12 })
  yPosition -= 35

  // === ПОСТАВЩИК ===
  drawText('Поставщик:', leftMargin, yPosition, { size: 11, bold: true })
  yPosition -= 15
  drawText(COMPANY_INFO.fullName, leftMargin + 10, yPosition, { size: 9 })
  yPosition -= 13
  drawText(`ИНН: ${COMPANY_INFO.inn} / КПП: ${COMPANY_INFO.kpp} / ОГРН: ${COMPANY_INFO.ogrn}`, leftMargin + 10, yPosition, { size: 9 })
  yPosition -= 13
  drawText(`Юридический адрес: ${COMPANY_INFO.legalAddress}`, leftMargin + 10, yPosition, { size: 9 })
  yPosition -= 13
  drawText(`Р/с: ${COMPANY_INFO.account}`, leftMargin + 10, yPosition, { size: 9 })
  yPosition -= 13
  drawText(`Банк: ${COMPANY_INFO.bank}`, leftMargin + 10, yPosition, { size: 9 })
  yPosition -= 13
  drawText(`БИК: ${COMPANY_INFO.bik} / К/с: ${COMPANY_INFO.corrAccount}`, leftMargin + 10, yPosition, { size: 9 })
  yPosition -= 25

  // === ПОКУПАТЕЛЬ ===
  const legalEntity = order.client?.legalEntities?.[0]
  drawText('Покупатель:', leftMargin, yPosition, { size: 11, bold: true })
  yPosition -= 15

  if (legalEntity) {
    const clientName = legalEntity.shortName || legalEntity.fullName || ''
    drawText(clientName, leftMargin + 10, yPosition, { size: 9 })
    yPosition -= 13

    if (legalEntity.inn) {
      const innKpp = `ИНН: ${legalEntity.inn}${legalEntity.kpp ? ` / КПП: ${legalEntity.kpp}` : ''}`
      drawText(innKpp, leftMargin + 10, yPosition, { size: 9 })
      yPosition -= 13
    }

    if (legalEntity.legalAddress) {
      drawText(`Адрес: ${legalEntity.legalAddress}`, leftMargin + 10, yPosition, { size: 9 })
      yPosition -= 13
    }
  } else {
    const clientName = order.client?.name || order.clientName || ''
    drawText(clientName, leftMargin + 10, yPosition, { size: 9 })
    yPosition -= 13

    if (order.clientPhone) {
      drawText(`Телефон: ${order.clientPhone}`, leftMargin + 10, yPosition, { size: 9 })
      yPosition -= 13
    }

    if (order.clientEmail) {
      drawText(`Email: ${order.clientEmail}`, leftMargin + 10, yPosition, { size: 9 })
      yPosition -= 13
    }
  }
  yPosition -= 20

  // === ТАБЛИЦА ===
  const tableTop = yPosition
  const colWidths = [30, 260, 60, 80, 85]
  const colPositions = [
    leftMargin,
    leftMargin + colWidths[0],
    leftMargin + colWidths[0] + colWidths[1],
    leftMargin + colWidths[0] + colWidths[1] + colWidths[2],
    leftMargin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]
  ]

  // Заголовки таблицы
  page.drawLine({
    start: { x: leftMargin, y: yPosition },
    end: { x: rightMargin, y: yPosition },
    thickness: 1,
    color: blackColor
  })
  yPosition -= 15

  drawText('№', colPositions[0], yPosition, { size: 9, bold: true })
  drawText('Наименование товара', colPositions[1], yPosition, { size: 9, bold: true })
  drawText('Кол-во', colPositions[2], yPosition, { size: 9, bold: true })
  drawText('Цена', colPositions[3], yPosition, { size: 9, bold: true })
  drawText('Сумма', colPositions[4], yPosition, { size: 9, bold: true })

  yPosition -= 5
  page.drawLine({
    start: { x: leftMargin, y: yPosition },
    end: { x: rightMargin, y: yPosition },
    thickness: 1,
    color: blackColor
  })
  yPosition -= 15

  // Строки товаров
  order.items.forEach((item, index) => {
    const itemBrand = item.brand ? `${item.brand} - ` : ''
    const itemName = item.name || 'Товар'
    const itemArticle = item.article ? `Арт: ${item.article}` : ''

    drawText(String(index + 1), colPositions[0], yPosition, { size: 8 })
    drawText(`${itemBrand}${itemName}`, colPositions[1], yPosition, { size: 8 })
    if (itemArticle) {
      drawText(itemArticle, colPositions[1], yPosition - 10, { size: 7, color: grayColor })
    }
    drawText(`${item.quantity} шт`, colPositions[2], yPosition, { size: 8 })
    drawText(formatCurrency(item.price), colPositions[3], yPosition, { size: 8 })
    drawText(formatCurrency(item.totalPrice), colPositions[4], yPosition, { size: 8 })

    yPosition -= itemArticle ? 25 : 20
  })

  page.drawLine({
    start: { x: leftMargin, y: yPosition },
    end: { x: rightMargin, y: yPosition },
    thickness: 1,
    color: blackColor
  })
  yPosition -= 20

  // === ИТОГО ===
  const vatRate = 0.20
  const vatAmount = Math.round((order.finalAmount * vatRate / (1 + vatRate)) * 100) / 100
  const amountWithoutVAT = order.finalAmount - vatAmount

  drawText(`Сумма без НДС: ${formatCurrency(amountWithoutVAT)}`, rightMargin - 200, yPosition, { size: 10 })
  yPosition -= 15
  drawText(`НДС (20%): ${formatCurrency(vatAmount)}`, rightMargin - 200, yPosition, { size: 10 })
  yPosition -= 15
  drawText(`Итого к оплате: ${formatCurrency(order.finalAmount)}`, rightMargin - 200, yPosition, { size: 12, bold: true })
  yPosition -= 30

  // === НАЗНАЧЕНИЕ ПЛАТЕЖА ===
  drawText('Назначение платежа:', leftMargin, yPosition, { size: 9, bold: true })
  yPosition -= 13
  const paymentPurpose = `Оплата по счёту ${order.orderNumber} от ${formatDate(order.createdAt)} за автозапчасти.`
  drawText(paymentPurpose, leftMargin, yPosition, { size: 8 })
  yPosition -= 12
  drawText(`Сумма ${formatCurrency(order.finalAmount)}, в том числе НДС (20%) ${formatCurrency(vatAmount)}.`, leftMargin, yPosition, { size: 8 })
  yPosition -= 30

  // === QR-КОД ДЛЯ ОПЛАТЫ ===
  try {
    const qrData = generatePaymentQRData(order)
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M'
    })

    const qrImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64')
    const qrImage = await pdfDoc.embedPng(qrImageBytes)

    const qrSize = 80
    page.drawImage(qrImage, {
      x: rightMargin - qrSize,
      y: yPosition - qrSize,
      width: qrSize,
      height: qrSize
    })

    drawText('Оплатить по QR', rightMargin - qrSize, yPosition - qrSize - 15, { size: 8, color: grayColor })
  } catch (error) {
    console.error('Ошибка генерации QR-кода:', error)
  }

  // === ПОДПИСЬ ===
  drawText(`Генеральный директор`, leftMargin, yPosition, { size: 9 })
  drawText('________________', leftMargin + 130, yPosition, { size: 9 })
  drawText(COMPANY_INFO.director, leftMargin + 220, yPosition, { size: 9 })
  yPosition -= 20
  drawText('М.П.', leftMargin, yPosition, { size: 9 })

  // Сохраняем PDF в Buffer
  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
