import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Проверка невалидных legalEntityId...')

  // Находим все заказы с невалидными legalEntityId
  const ordersWithInvalidLegalEntity = await prisma.$queryRaw<Array<{ id: string; legalEntityId: string }>>`
    SELECT id, "legalEntityId"
    FROM orders
    WHERE "legalEntityId" IS NOT NULL
      AND "legalEntityId" NOT IN (SELECT id FROM client_legal_entities)
  `

  console.log(`Найдено заказов с невалидными legalEntityId: ${ordersWithInvalidLegalEntity.length}`)

  if (ordersWithInvalidLegalEntity.length > 0) {
    console.log('🧹 Очистка невалидных legalEntityId...')

    const result = await prisma.$executeRaw`
      UPDATE orders
      SET "legalEntityId" = NULL
      WHERE "legalEntityId" IS NOT NULL
        AND "legalEntityId" NOT IN (SELECT id FROM client_legal_entities)
    `

    console.log(`✅ Очищено записей: ${result}`)
  } else {
    console.log('✅ Все legalEntityId валидны!')
  }

  // Показываем статистику
  const totalOrders = await prisma.order.count()
  const ordersWithLegalEntity = await prisma.order.count({
    where: {
      legalEntityId: { not: null }
    }
  })

  console.log('\n📊 Статистика:')
  console.log(`Всего заказов: ${totalOrders}`)
  console.log(`Заказов с юрлицом: ${ordersWithLegalEntity}`)
  console.log(`Заказов без юрлица: ${totalOrders - ordersWithLegalEntity}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('\n✅ Готово! Теперь можно выполнить: npx prisma db push')
  })
  .catch(async (e) => {
    console.error('❌ Ошибка:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
