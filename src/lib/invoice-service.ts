import QRCode from 'qrcode'
import puppeteer from 'puppeteer'

interface InvoiceData {
  invoiceNumber: string
  amount: number
  clientName: string
  clientInn?: string
  clientAddress?: string
  contractNumber?: string
  description: string
  dueDate: Date
}

interface CompanyRequisites {
  name: string
  inn: string
  kpp: string
  ogrn: string
  address: string
  bankName: string
  bik: string
  accountNumber: string
  correspondentAccount: string
}

export class InvoiceService {
  private static companyRequisites: CompanyRequisites = {
    name: 'ООО "Протек Авто"',
    inn: '7701234567',
    kpp: '770101001',
    ogrn: '1027700123456',
    address: '123456, г. Москва, ул. Примерная, д. 1, оф. 1',
    bankName: 'ПАО "Сбербанк"',
    bik: '044525225',
    accountNumber: '40702810123456789012',
    correspondentAccount: '30101810400000000225'
  }

  static generateInvoiceNumber(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    
    return `СЧ-${year}${month}${day}-${hours}${minutes}${seconds}`
  }

  static async generateQRCode(amount: number, purpose: string, invoiceNumber: string): Promise<string> {
    // Генерируем QR-код для СБП (Система быстрых платежей)
    const sbpData = [
      'ST00012',                                    // Статичный QR-код
      '1|Name=' + InvoiceService.companyRequisites.name,
      '1|PersonAcc=' + InvoiceService.companyRequisites.accountNumber,
      '1|BankName=' + InvoiceService.companyRequisites.bankName,
      '1|BIC=' + InvoiceService.companyRequisites.bik,
      '1|CorrespAcc=' + InvoiceService.companyRequisites.correspondentAccount,
      '8|Purpose=' + purpose,
      '7|Sum=' + (amount * 100).toString(), // в копейках
      '1|PayeeINN=' + InvoiceService.companyRequisites.inn,
      '1|KPP=' + InvoiceService.companyRequisites.kpp
    ].join('|')

    try {
      // Создаем QR-код как Data URL
      const qrCodeDataURL = await QRCode.toDataURL(sbpData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 200
      })
      
      return qrCodeDataURL
    } catch (error) {
      console.error('Ошибка генерации QR-кода:', error)
      // Возвращаем пустой QR-код в случае ошибки
      return await QRCode.toDataURL('Error generating QR code', { width: 200 })
    }
  }

  static formatDate(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(amount)
  }

  static async generatePDF(invoiceData: InvoiceData): Promise<Buffer> {
    console.log('📄 Генерируем QR-код для счета:', invoiceData.invoiceNumber)
    const qrCodeDataURL = await this.generateQRCode(
      invoiceData.amount,
      invoiceData.description,
      invoiceData.invoiceNumber
    )

    console.log('📄 Создаем PDF документ для счета:', invoiceData.invoiceNumber)
    
    // HTML шаблон для красивого счета
    const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Счет на оплату № ${invoiceData.invoiceNumber}</title>
    <style>
        @page { 
            size: A4; 
            margin: 20mm; 
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #1a365d;
            padding-bottom: 20px;
        }
        
        .header h1 {
            font-size: 24px;
            color: #1a365d;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .header .invoice-number {
            font-size: 18px;
            color: #2d3748;
            margin-bottom: 5px;
        }
        
        .header .date {
            font-size: 14px;
            color: #4a5568;
        }
        
        .section {
            margin-bottom: 25px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            background: #f7fafc;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #1a365d;
            margin-bottom: 10px;
            border-bottom: 1px solid #cbd5e0;
            padding-bottom: 5px;
        }
        
        .company-info, .client-info {
            line-height: 1.6;
        }
        
        .bank-details {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #cbd5e0;
        }
        
        .bank-details .subtitle {
            font-weight: bold;
            color: #4a5568;
            margin-bottom: 8px;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .table th {
            background: #1a365d;
            color: white;
            padding: 12px 8px;
            text-align: center;
            font-weight: bold;
            font-size: 11px;
        }
        
        .table td {
            padding: 12px 8px;
            border-bottom: 1px solid #e2e8f0;
            text-align: center;
        }
        
        .table td:nth-child(2) {
            text-align: left;
            max-width: 200px;
        }
        
        .table td:nth-child(5),
        .table td:nth-child(6) {
            text-align: right;
            font-weight: bold;
        }
        
        .totals {
            text-align: right;
            margin: 20px 0;
            font-size: 14px;
        }
        
        .totals .final-total {
            font-size: 16px;
            font-weight: bold;
            color: #1a365d;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #1a365d;
        }
        
        .payment-terms {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .payment-terms .title {
            font-weight: bold;
            color: #c53030;
            margin-bottom: 10px;
        }
        
        .qr-section {
            display: flex;
            align-items: flex-start;
            gap: 20px;
            margin: 30px 0;
            padding: 20px;
            background: #f0fff4;
            border: 1px solid #9ae6b4;
            border-radius: 8px;
        }
        
        .qr-code {
            flex-shrink: 0;
        }
        
        .qr-code img {
            width: 120px;
            height: 120px;
            border: 2px solid #38a169;
            border-radius: 8px;
        }
        
        .qr-instructions {
            flex: 1;
        }
        
        .qr-instructions .title {
            font-size: 14px;
            font-weight: bold;
            color: #22543d;
            margin-bottom: 10px;
        }
        
        .qr-instructions ol {
            margin-left: 20px;
            color: #2f855a;
        }
        
        .qr-instructions li {
            margin-bottom: 5px;
        }
        
        .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            padding-top: 30px;
        }
        
        .signature {
            width: 45%;
        }
        
        .signature .title {
            font-weight: bold;
            color: #1a365d;
            margin-bottom: 30px;
        }
        
        .signature .line {
            border-bottom: 1px solid #4a5568;
            height: 1px;
            margin-bottom: 5px;
        }
        
        .signature .label {
            font-size: 10px;
            color: #718096;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #718096;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>СЧЕТ НА ОПЛАТУ</h1>
        <div class="invoice-number">№ ${invoiceData.invoiceNumber}</div>
        <div class="date">от ${this.formatDate(new Date())}</div>
    </div>

    <div class="section">
        <div class="section-title">Поставщик</div>
        <div class="company-info">
            <div><strong>Наименование:</strong> ${this.companyRequisites.name}</div>
            <div><strong>Адрес:</strong> ${this.companyRequisites.address}</div>
            <div><strong>ИНН/КПП:</strong> ${this.companyRequisites.inn} / ${this.companyRequisites.kpp}</div>
            <div><strong>ОГРН:</strong> ${this.companyRequisites.ogrn}</div>
        </div>
        <div class="bank-details">
            <div class="subtitle">Банковские реквизиты:</div>
            <div><strong>Банк получателя:</strong> ${this.companyRequisites.bankName}</div>
            <div><strong>БИК:</strong> ${this.companyRequisites.bik}</div>
            <div><strong>Расчетный счет:</strong> ${this.companyRequisites.accountNumber}</div>
            <div><strong>Корр. счет:</strong> ${this.companyRequisites.correspondentAccount}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Плательщик</div>
        <div class="client-info">
            <div><strong>Наименование:</strong> ${invoiceData.clientName}</div>
            ${invoiceData.clientInn ? `<div><strong>ИНН:</strong> ${invoiceData.clientInn}</div>` : ''}
            ${invoiceData.clientAddress ? `<div><strong>Адрес:</strong> ${invoiceData.clientAddress}</div>` : ''}
            ${invoiceData.contractNumber ? `<div><strong>Договор:</strong> ${invoiceData.contractNumber}</div>` : ''}
        </div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th style="width: 40px;">№</th>
                <th style="width: 300px;">Наименование товара, работ, услуг</th>
                <th style="width: 80px;">Ед. изм.</th>
                <th style="width: 60px;">Кол-во</th>
                <th style="width: 100px;">Цена</th>
                <th style="width: 100px;">Сумма</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1</td>
                <td style="text-align: left; padding-left: 10px;">${invoiceData.description}</td>
                <td>услуга</td>
                <td>1</td>
                <td style="text-align: right;">${this.formatCurrency(invoiceData.amount)}</td>
                <td style="text-align: right;">${this.formatCurrency(invoiceData.amount)}</td>
            </tr>
        </tbody>
    </table>

    <div class="totals">
        <div>Итого без НДС: ${this.formatCurrency(invoiceData.amount)}</div>
        <div>НДС не облагается</div>
        <div class="final-total">Всего к оплате: ${this.formatCurrency(invoiceData.amount)}</div>
    </div>

    <div class="payment-terms">
        <div class="title">Условия оплаты:</div>
        <div>Срок оплаты: до ${this.formatDate(invoiceData.dueDate)}</div>
        <div>Счет действителен к оплате в течение 3 банковских дней</div>
    </div>

    <div class="qr-section">
        <div class="qr-code">
            <img src="${qrCodeDataURL}" alt="QR-код для оплаты" />
            <div style="text-align: center; font-size: 10px; margin-top: 5px; color: #22543d;">
                QR-код для оплаты<br>через СБП
            </div>
        </div>
        <div class="qr-instructions">
            <div class="title">Для быстрой оплаты:</div>
            <ol>
                <li>Откройте приложение вашего банка</li>
                <li>Выберите "Оплата по QR-коду"</li>
                <li>Наведите камеру на QR-код</li>
                <li>Проверьте данные и подтвердите платеж</li>
            </ol>
        </div>
    </div>

    <div class="signatures">
        <div class="signature">
            <div class="title">Поставщик:</div>
            <div class="line"></div>
            <div class="label">Подпись / М.П.</div>
        </div>
        <div class="signature">
            <div class="title">Покупатель:</div>
            <div class="line"></div>
            <div class="label">Подпись / М.П.</div>
        </div>
    </div>

    <div class="footer">
        Документ сформирован автоматически системой "Протек Авто"<br>
        ${new Date().toLocaleString('ru-RU')}
    </div>
</body>
</html>
    `

    try {
      console.log('🚀 Запускаем Puppeteer для генерации PDF...')
      
      // Настройки Puppeteer для Docker
      const browser = await puppeteer.launch({
        headless: true,
        timeout: 60000,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--headless',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--no-first-run',
          '--disable-default-apps',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection'
        ]
      })

      const page = await browser.newPage()
      
      // Устанавливаем контент
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0', 
        timeout: 60000 
      })

      console.log('📄 Генерируем PDF...')
      
      // Генерируем PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        timeout: 60000,
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      })

      await browser.close()
      
      console.log('✅ PDF успешно сгенерирован')
      return Buffer.from(pdfBuffer)
      
    } catch (error) {
      console.error('❌ Ошибка генерации PDF:', error)
      throw new Error('Не удалось сгенерировать PDF: ' + (error as Error).message)
    }
  }
} 