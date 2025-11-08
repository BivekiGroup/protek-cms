import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function migrateClientNumbers() {
  console.log('Начинаем миграцию номеров клиентов...')

  try {
    // Получаем всех клиентов, отсортированных по дате создания
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        clientNumber: true,
        createdAt: true,
      },
    })

    console.log(`Найдено клиентов: ${clients.length}`)

    // Обновляем номера клиентов, начиная с 1000
    let clNumber = 1000
    let anonNumber = 1000

    for (const client of clients) {
      const oldNumber = client.clientNumber
      let newClientNumber: string

      // Если это анонимный клиент, используем префикс AN
      if (oldNumber.startsWith('ANON_') || oldNumber.startsWith('AN')) {
        newClientNumber = `AN${anonNumber.toString().padStart(4, '0')}`
        anonNumber++
      } else {
        // Иначе используем префикс CL
        newClientNumber = `CL${clNumber.toString().padStart(4, '0')}`
        clNumber++
      }

      await prisma.client.update({
        where: { id: client.id },
        data: { clientNumber: newClientNumber },
      })

      console.log(`Обновлен клиент: ${oldNumber} -> ${newClientNumber}`)
    }

    console.log(`✅ Миграция завершена. Обновлено клиентов: ${clients.length}`)
    console.log(`Следующий CL номер будет: CL${clNumber.toString().padStart(4, '0')}`)
    console.log(`Следующий AN номер будет: AN${anonNumber.toString().padStart(4, '0')}`)
  } catch (error) {
    console.error('❌ Ошибка миграции:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateClientNumbers()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
