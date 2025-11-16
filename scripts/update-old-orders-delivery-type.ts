import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Поиск заказов с null deliveryTime...')

  // Находим все заказы с null deliveryTime
  const orders = await prisma.order.findMany({
    where: {
      deliveryTime: null
    },
    include: {
      client: {
        include: {
          deliveryAddresses: true
        }
      }
    }
  })

  console.log(`Найдено заказов: ${orders.length}`)

  let updated = 0
  let notFound = 0

  for (const order of orders) {
    if (!order.client || !order.deliveryAddress) {
      notFound++
      continue
    }

    // Ищем совпадающий адрес доставки у клиента
    const matchingAddress = order.client.deliveryAddresses.find(addr => {
      // Убираем лишние пробелы и приводим к нижнему регистру для сравнения
      const orderAddr = order.deliveryAddress?.trim().toLowerCase()
      const clientAddr = addr.address.trim().toLowerCase()
      return orderAddr === clientAddr
    })

    if (matchingAddress) {
      // Определяем тип доставки на основе deliveryType из адреса
      const deliveryTime = matchingAddress.deliveryType === 'COURIER' ? 'courier' : 'pickup'

      await prisma.order.update({
        where: { id: order.id },
        data: { deliveryTime }
      })

      console.log(`✅ ${order.orderNumber}: ${deliveryTime}`)
      updated++
    } else {
      // Если не нашли совпадающий адрес, устанавливаем courier по умолчанию
      await prisma.order.update({
        where: { id: order.id },
        data: { deliveryTime: 'courier' }
      })

      console.log(`⚠️  ${order.orderNumber}: courier (по умолчанию)`)
      notFound++
    }
  }

  console.log('\n📊 Статистика:')
  console.log(`Обновлено по адресу: ${updated}`)
  console.log(`Установлено по умолчанию: ${notFound}`)
  console.log(`Всего обновлено: ${updated + notFound}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('\n✅ Готово!')
  })
  .catch(async (e) => {
    console.error('❌ Ошибка:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
