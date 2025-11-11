import React from 'react'
import ReactPDF from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Регистрируем шрифты Roboto напрямую с GitHub (100% работает!)
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
      fontWeight: 'normal'
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 'bold'
    }
  ]
})

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Roboto',
    fontSize: 9
  },
  header: {
    marginBottom: 20
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5
  },
  date: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 20
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5
  },
  table: {
    marginTop: 20,
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 15
  },
  col1: { width: '6%' },
  col2: { width: '44%' },
  col3: { width: '15%' },
  col4: { width: '17%' },
  col5: { width: '18%' },
  summary: {
    marginTop: 20,
    alignItems: 'flex-end'
  },
  summaryText: {
    fontSize: 10,
    marginBottom: 3
  },
  summaryTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5
  },
  footer: {
    marginTop: 30
  }
})

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

export async function generateInvoicePDF(order: Order): Promise<Buffer> {
  const orderDate = new Date(order.createdAt)
  const dateStr = orderDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  const vatRate = 0.20
  const vatAmount = Math.round((order.finalAmount * vatRate / (1 + vatRate)) * 100) / 100
  const amountWithoutVAT = order.finalAmount - vatAmount

  const legalEntity = order.client?.legalEntities?.[0]

  const InvoiceDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Шапка компании */}
        <View style={styles.header}>
          <Text style={styles.companyName}>ООО &quot;ПРОТЕКАВТО&quot;</Text>
          <Text>ИНН 7701234567 / КПП 770101001</Text>
          <Text>123456, г. Москва, ул. Примерная, д. 1</Text>
        </View>

        {/* Заголовок */}
        <Text style={styles.title}>Счёт на оплату № {order.orderNumber}</Text>
        <Text style={styles.date}>от {dateStr}</Text>

        {/* Поставщик */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Поставщик</Text>
          <Text>ООО &quot;ПРОТЕКАВТО&quot;</Text>
          <Text>ИНН: 7701234567 / КПП: 770101001</Text>
          <Text>Адрес: 123456, г. Москва, ул. Примерная, д. 1</Text>
          <Text>Р/с: 40702810123456789012</Text>
          <Text>Банк: ПАО &quot;Сбербанк&quot;</Text>
          <Text>БИК: 044525225 / К/с: 30101810400000000225</Text>
        </View>

        {/* Покупатель */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Покупатель</Text>
          {legalEntity ? (
            <>
              <Text>{legalEntity.shortName || legalEntity.fullName || ''}</Text>
              {legalEntity.inn && (
                <Text>ИНН: {legalEntity.inn}{legalEntity.kpp ? ` / КПП: ${legalEntity.kpp}` : ''}</Text>
              )}
              {legalEntity.legalAddress && <Text>Адрес: {legalEntity.legalAddress}</Text>}
            </>
          ) : (
            <>
              <Text>{order.client?.name || order.clientName || ''}</Text>
              {order.clientPhone && <Text>Телефон: {order.clientPhone}</Text>}
              {order.clientEmail && <Text>Email: {order.clientEmail}</Text>}
            </>
          )}
        </View>

        {/* Таблица */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>№</Text>
            <Text style={styles.col2}>Наименование товара</Text>
            <Text style={styles.col3}>Кол-во</Text>
            <Text style={styles.col4}>Цена</Text>
            <Text style={styles.col5}>Сумма</Text>
          </View>
          {order.items.map((item, index) => {
            const itemName = item.name || 'Товар'
            const itemBrand = item.brand ? `${item.brand} - ` : ''
            const itemArticle = item.article ? `Арт: ${item.article}` : ''
            const fullName = `${itemBrand}${itemName}\n${itemArticle}`

            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.col1}>{index + 1}</Text>
                <Text style={styles.col2}>{fullName}</Text>
                <Text style={styles.col3}>{item.quantity} шт</Text>
                <Text style={styles.col4}>{item.price.toFixed(2)} руб.</Text>
                <Text style={styles.col5}>{item.totalPrice.toFixed(2)} руб.</Text>
              </View>
            )
          })}
        </View>

        {/* Итого */}
        <View style={styles.summary}>
          <Text style={styles.summaryText}>Сумма без НДС: {amountWithoutVAT.toFixed(2)} руб.</Text>
          <Text style={styles.summaryText}>НДС (20%): {vatAmount.toFixed(2)} руб.</Text>
          <Text style={styles.summaryTotal}>Итого к оплате: {order.finalAmount.toFixed(2)} руб.</Text>
        </View>

        {/* Назначение платежа */}
        <View style={styles.footer}>
          <Text>
            Назначение платежа: Оплата по счёту {order.orderNumber} от {orderDate.toLocaleDateString('ru-RU')} за автозапчасти.
            Сумма {order.finalAmount.toFixed(2)} руб., в том числе НДС (20%) {vatAmount.toFixed(2)} руб.
          </Text>
        </View>

        {/* Подпись */}
        <View style={{ marginTop: 30 }}>
          <Text>Директор _________________ А.А. Иванов</Text>
          <Text>М.П.</Text>
        </View>
      </Page>
    </Document>
  )

  // Используем renderToBuffer для генерации PDF
  const pdfBuffer = await ReactPDF.renderToBuffer(InvoiceDocument)
  return pdfBuffer
}
