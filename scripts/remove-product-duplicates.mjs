#!/usr/bin/env node
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/index.js'

const prisma = new PrismaClient()

function normalizeBrand(brand) {
  return (brand || '').trim().toUpperCase()
}

function normalizeArticle(article) {
  if (!article) return ''
  return article.replace(/\s+/g, '').replace(/[-–—]+/g, '').trim().toUpperCase()
}

function makeKey(article, brand) {
  const normArticle = normalizeArticle(article)
  const normBrand = normalizeBrand(brand)
  if (!normArticle || !normBrand) return ''
  return `${normArticle}__${normBrand}`
}

function pickPrimary(products) {
  return products
    .slice()
    .sort((a, b) => {
      const aHasOnec = a.onecProductId ? 1 : 0
      const bHasOnec = b.onecProductId ? 1 : 0
      if (aHasOnec !== bHasOnec) return bHasOnec - aHasOnec

      const aHasExternal = a.externalId ? 1 : 0
      const bHasExternal = b.externalId ? 1 : 0
      if (aHasExternal !== bHasExternal) return bHasExternal - aHasExternal

      const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (createdDiff !== 0) return createdDiff

      return a.id.localeCompare(b.id)
    })[0]
}

async function main() {
  const force = process.argv.includes('--yes') || process.env.FORCE === '1'

  const products = await prisma.product.findMany({
    select: {
      id: true,
      article: true,
      brand: true,
      name: true,
      createdAt: true,
      onecProductId: true,
      externalId: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const groups = new Map()
  for (const product of products) {
    const key = makeKey(product.article, product.brand)
    if (!key) continue
    const list = groups.get(key)
    if (list) {
      list.push(product)
    } else {
      groups.set(key, [product])
    }
  }

  const duplicates = Array.from(groups.entries()).filter(([, list]) => list.length > 1)

  if (duplicates.length === 0) {
    console.log('No duplicate products found — nothing to do.')
    return
  }

  console.log(`Found ${duplicates.length} article/brand groups with duplicates.`)

  let totalRemoved = 0
  const dryRun = !force

  for (const [key, list] of duplicates) {
    const primary = pickPrimary(list)
    const toRemove = list.filter(p => p.id !== primary.id)
    console.log(`\nGroup ${key}: keeping ${primary.id} (${primary.name}) and removing ${toRemove.length} duplicates.`)
    for (const dup of toRemove) {
      console.log(`  - Candidate to remove: ${dup.id} (${dup.name}) [article='${dup.article}', brand='${dup.brand}', product_id='${dup.onecProductId ?? ''}', externalId='${dup.externalId ?? ''}']`)
    }
    if (dryRun) continue

    for (const dup of toRemove) {
      await prisma.$transaction(async tx => {
        const [orders, views, history] = await Promise.all([
          tx.orderItem.updateMany({ where: { productId: dup.id }, data: { productId: primary.id } }),
          tx.productViewEvent.updateMany({ where: { productId: dup.id }, data: { productId: primary.id } }),
          tx.productHistory.updateMany({ where: { productId: dup.id }, data: { productId: primary.id } }),
        ])

        console.log(`    Reassigned order_items=${orders.count}, product_views=${views.count}, product_history=${history.count} from ${dup.id} to ${primary.id}`)

        await tx.product.delete({ where: { id: dup.id } })
        console.log(`    Deleted duplicate product ${dup.id}`)
        totalRemoved += 1
      })
    }
  }

  if (dryRun) {
    console.log('\nDry run complete. Re-run with --yes to apply deletions.')
  } else {
    console.log(`\nDone. Removed ${totalRemoved} duplicate products.`)
  }
}

main()
  .catch(async err => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

