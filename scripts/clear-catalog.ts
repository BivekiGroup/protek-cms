#!/usr/bin/env tsx
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const force = process.argv.includes('--yes') || process.env.FORCE === '1'
  if (!force) {
    console.log('Safety check: pass --yes to actually delete. Example:')
    console.log('  npm run db:clear-catalog -- --yes')
    process.exit(1)
  }

  const [productsBefore, categoriesBefore] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
  ])

  console.log(`Found products: ${productsBefore}, categories: ${categoriesBefore}`)

  if (productsBefore === 0 && categoriesBefore === 0) {
    console.log('Nothing to delete. Exiting.')
    return
  }

  // Collect all product IDs to safely nullify FKs in optional relations
  const productIds = (await prisma.product.findMany({ select: { id: true } })).map(p => p.id)

  if (productIds.length > 0) {
    const [nulledOrderItems, nulledViewEvents] = await Promise.all([
      prisma.orderItem.updateMany({ data: { productId: null }, where: { productId: { in: productIds } } }),
      prisma.productViewEvent.updateMany({ data: { productId: null }, where: { productId: { in: productIds } } }),
    ])
    console.log(`Nullified FKs: order_items=${nulledOrderItems.count}, product_views=${nulledViewEvents.count}`)
  }

  // Delete products first (cascades remove images/options/characteristics joins, m:n links)
  const delProducts = await prisma.product.deleteMany({})
  console.log(`Deleted products: ${delProducts.count}`)

  // Then delete categories (hierarchy set to cascade via relation)
  const delCategories = await prisma.category.deleteMany({})
  console.log(`Deleted categories: ${delCategories.count}`)

  const [productsAfter, categoriesAfter] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
  ])
  console.log(`After cleanup — products: ${productsAfter}, categories: ${categoriesAfter}`)
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})

