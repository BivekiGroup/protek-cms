import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Регистрируем шрифты для поддержки кириллицы
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff',
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff',
      fontWeight: 'bold',
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff',
  },
  // Шапка
  header: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  // Заголовок счета
  titleSection: {
    marginTop: 20,
    marginBottom: 25,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  // Информационные блоки
  infoSection: {
    marginBottom: 20,
  },
  infoBlock: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderLeft: 3,
    borderLeftColor: '#2563eb',
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 9,
    color: '#334155',
    marginBottom: 3,
    lineHeight: 1.4,
  },
  // Таблица
  table: {
    marginTop: 25,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    padding: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
    padding: 10,
    minHeight: 35,
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 9,
    color: '#1e293b',
    paddingRight: 5,
  },
  tableCellBold: {
    fontWeight: 'bold',
  },
  // Колонки таблицы
  col1: { width: '8%' },
  col2: { width: '48%' },
  col3: { width: '12%' },
  col4: { width: '16%' },
  col5: { width: '16%' },
  // Итоговый блок
  totalSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalBox: {
    width: '45%',
    padding: 15,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 10,
    color: '#475569',
  },
  totalValue: {
    fontSize: 10,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTop: 2,
    borderTopColor: '#cbd5e1',
    marginTop: 5,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  // Дополнительная информация
  additionalInfo: {
    marginTop: 25,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    borderLeft: 3,
    borderLeftColor: '#f59e0b',
  },
  additionalInfoText: {
    fontSize: 9,
    color: '#78350f',
    lineHeight: 1.4,
  },
  // Подвал
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: 1,
    borderTopColor: '#e2e8f0',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signatureBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    color: '#64748b',
    marginRight: 10,
  },
  signatureLine: {
    width: 150,
    borderBottom: 1,
    borderBottomColor: '#94a3b8',
    marginRight: 10,
  },
  stamp: {
    fontSize: 10,
    color: '#64748b',
    paddingLeft: 10,
  },
})

interface InvoicePDFProps {
  order: any
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ order }) => {
  const client = order.client
  const legalEntity = client?.legalEntities?.[0]
  const vatRate = 0.20 // 20% НДС
  const vatAmount = Math.round((order.finalAmount * vatRate / (1 + vatRate)) * 100) / 100

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Шапка компании */}
        <View style={styles.header}>
          <Text style={styles.companyName}>ООО "ПРОТЕКАВТО"</Text>
          <Text style={styles.companyInfo}>ИНН 7701234567 / КПП 770101001</Text>
          <Text style={styles.companyInfo}>123456, г. Москва, ул. Примерная, д. 1</Text>
        </View>

        {/* Заголовок счета */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Счёт на оплату № {order.orderNumber}</Text>
          <Text style={styles.subtitle}>
            от {new Date(order.createdAt).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </View>

        {/* Информация о поставщике и покупателе */}
        <View style={styles.infoSection}>
          {/* Поставщик */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Поставщик</Text>
            <Text style={styles.infoText}>ООО "ПРОТЕКАВТО"</Text>
            <Text style={styles.infoText}>ИНН: 7701234567 / КПП: 770101001</Text>
            <Text style={styles.infoText}>Адрес: 123456, г. Москва, ул. Примерная, д. 1</Text>
            <Text style={styles.infoText}>Р/с: 40702810123456789012</Text>
            <Text style={styles.infoText}>Банк: ПАО "Сбербанк"</Text>
            <Text style={styles.infoText}>БИК: 044525225 / К/с: 30101810400000000225</Text>
          </View>

          {/* Покупатель */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Покупатель</Text>
            {legalEntity ? (
              <>
                <Text style={styles.infoText}>{legalEntity.shortName || legalEntity.fullName}</Text>
                <Text style={styles.infoText}>ИНН: {legalEntity.inn}{legalEntity.kpp ? ` / КПП: ${legalEntity.kpp}` : ''}</Text>
                {legalEntity.legalAddress && (
                  <Text style={styles.infoText}>Адрес: {legalEntity.legalAddress}</Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.infoText}>{client?.name || order.clientName}</Text>
                {order.clientPhone && (
                  <Text style={styles.infoText}>Телефон: {order.clientPhone}</Text>
                )}
                {order.clientEmail && (
                  <Text style={styles.infoText}>Email: {order.clientEmail}</Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Таблица товаров */}
        <View style={styles.table}>
          {/* Заголовок таблицы */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>№</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Наименование товара</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>Кол-во</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>Цена</Text>
            <Text style={[styles.tableHeaderText, styles.col5]}>Сумма</Text>
          </View>

          {/* Строки таблицы */}
          {order.items.map((item: any, index: number) => {
            const itemName = item.name || item.product?.name || 'Товар'
            const itemBrand = item.brand ? ` (${item.brand})` : ''
            const itemArticle = item.article ? ` - Арт: ${item.article}` : ''

            return (
              <View
                key={item.id}
                style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
              >
                <Text style={[styles.tableCell, styles.col1]}>{index + 1}</Text>
                <View style={styles.col2}>
                  <Text style={[styles.tableCell, styles.tableCellBold]}>
                    {itemName}{itemBrand}
                  </Text>
                  {itemArticle && (
                    <Text style={[styles.tableCell, { fontSize: 8, color: '#64748b' }]}>
                      {itemArticle}
                    </Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.col3]}>{item.quantity} шт</Text>
                <Text style={[styles.tableCell, styles.col4]}>{item.price.toFixed(2)} руб.</Text>
                <Text style={[styles.tableCell, styles.col5, styles.tableCellBold]}>
                  {item.totalPrice.toFixed(2)} руб.
                </Text>
              </View>
            )
          })}
        </View>

        {/* Итоговый блок */}
        <View style={styles.totalSection} wrap={false}>
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Сумма без НДС:</Text>
              <Text style={styles.totalValue}>
                {(order.finalAmount - vatAmount).toFixed(2)} руб.
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>НДС (20%):</Text>
              <Text style={styles.totalValue}>{vatAmount.toFixed(2)} руб.</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Итого к оплате:</Text>
              <Text style={styles.grandTotalValue}>{order.finalAmount.toFixed(2)} руб.</Text>
            </View>
          </View>
        </View>

        {/* Назначение платежа */}
        <View style={styles.additionalInfo} wrap={false}>
          <Text style={styles.additionalInfoText}>
            <Text style={{ fontWeight: 'bold' }}>Назначение платежа: </Text>
            Оплата по счёту {order.orderNumber} от {new Date(order.createdAt).toLocaleDateString('ru-RU')}
            за автозапчасти. Сумма {order.finalAmount.toFixed(2)} руб., в том числе НДС (20%) {vatAmount.toFixed(2)} руб.
          </Text>
        </View>

        {/* Подпись */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Директор</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>А.А. Иванов</Text>
            </View>
            <Text style={styles.stamp}>М.П.</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default InvoicePDF
