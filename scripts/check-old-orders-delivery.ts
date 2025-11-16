import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Проверка старых заказов с null deliveryTime...')

  const orders = await prisma.order.findMany({
    where: {
      deliveryTime: null,
      comment: { not: null }
    },
    select: {
      id: true,
      orderNumber: true,
      comment: true,
      deliveryAddress: true
    },
    take: 10
  })

  console.log(`\nНайдено заказов: ${orders.length}\n`)

  orders.forEach(order => {
    console.log(`--- ${order.orderNumber} ---`)
    console.log(`Адрес: ${order.deliveryAddress}`)
    console.log(`Комментарий: ${order.comment}`)
    console.log('')
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Ошибка:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
