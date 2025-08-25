import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Simple in-memory rate limiter per API key
const rateMap = new Map<string, { count: number; resetAt: number }>()
// Simple in-memory idempotency cache (per API key)
const idemCache = new Map<string, { body: any; expiresAt: number }>()

function getCorsHeaders() {
  const isDev = process.env.NODE_ENV !== 'production'
  const allowedOrigin = process.env.FRONTEND_ORIGIN || (isDev ? 'http://localhost:3001' : 'https://protekauto.ru')
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Idempotency-Key, X-Forwarded-For',
    'Cache-Control': 'no-store'
  }
}

function normalizeBrand(brand?: string | null) {
  return (brand || '').trim().toUpperCase()
}

function normalizeArticle(article?: string | null) {
  if (!article) return ''
  return article.replace(/\s+/g, '').replace(/[-–—]+/g, '').trim().toUpperCase()
}

function slugify(input: string) {
  return (input || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s/_-]+/gi, '')
    .replace(/[\s/_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function getClientIp(req: NextRequest): string | null {
  const xf = req.headers.get('x-forwarded-for') || ''
  if (xf) return xf.split(',')[0].trim()
  return null
}

function checkAuth(req: NextRequest): { ok: true } | { ok: false; status: number; body: any } {
  const apiKey = req.headers.get('x-api-key') || ''
  const expected = process.env.ONEC_API_TOKEN || ''
  if (!expected || apiKey !== expected) {
    return { ok: false, status: 401, body: { ok: false, error: 'Unauthorized' } }
  }
  // optional IP allow list
  const allowList = (process.env.ONEC_IP_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean)
  if (allowList.length) {
    const ip = getClientIp(req)
    if (!ip || !allowList.includes(ip)) {
      return { ok: false, status: 401, body: { ok: false, error: 'IP not allowed' } }
    }
  }
  // rate limit
  const perMin = Number(process.env.ONEC_RATE_LIMIT_PER_MIN || 60)
  if (perMin > 0) {
    const now = Date.now()
    const slot = rateMap.get(apiKey)
    if (!slot || now >= slot.resetAt) {
      rateMap.set(apiKey, { count: 1, resetAt: now + 60_000 })
    } else {
      if (slot.count >= perMin) {
        return { ok: false, status: 429, body: { ok: false, error: 'Rate limit exceeded' } }
      }
      slot.count += 1
      rateMap.set(apiKey, slot)
    }
  }
  return { ok: true }
}

const productItemSchema = z.object({
  externalId: z.string().trim().min(1).optional(),
  article: z.string().trim().min(1),
  brand: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  price: z.number().finite().nonnegative().optional(),
  retailPrice: z.number().finite().nonnegative().optional(),
  stock: z.number().int().optional(),
  weight: z.number().finite().nonnegative().optional(),
  dimensions: z.string().trim().optional(),
  images: z.array(z.string().url()).optional(),
  categories: z.array(z.string().trim()).optional(),
  characteristics: z.record(z.string().trim()).optional(),
  isVisible: z.boolean().optional(),
})

const requestSchema = z.object({
  items: z.array(productItemSchema)
})

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: getCorsHeaders() })
}

export async function POST(req: NextRequest) {
  const headers = new Headers(getCorsHeaders())
  headers.set('content-type', 'application/json; charset=utf-8')

  const auth = checkAuth(req)
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers })
  }

  const reqId = randomUUID()
  const strict = (process.env.ONEC_STRICT_VALIDATION || 'false') === 'true'
  const maxBatch = Number(process.env.ONEC_MAX_BATCH_SIZE || 1000)
  const apiKey = req.headers.get('x-api-key') || ''
  const idemKeyHeader = req.headers.get('idempotency-key') || ''
  const cacheKey = idemKeyHeader ? `${apiKey}:${idemKeyHeader}` : ''

  let parsed: z.infer<typeof requestSchema>
  try {
    const body = await req.json()
    parsed = requestSchema.parse(body)
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: 'Validation error', details: e?.errors || String(e), requestId: reqId }), { status: 422, headers })
  }

  const items = parsed.items || []
  if (items.length === 0) {
    return new Response(JSON.stringify({ ok: true, created: 0, updated: 0, errors: [], items: [], requestId: reqId }), { status: 200, headers })
  }
  if (items.length > maxBatch) {
    return new Response(JSON.stringify({ ok: false, error: `Too many items: ${items.length} > ${maxBatch}`, requestId: reqId }), { status: 422, headers })
  }

  // Idempotency cache (optional): return previous result if key is present and fresh
  if (cacheKey) {
    const cached = idemCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(JSON.stringify({ ...cached.body, requestId: reqId, idempotent: true }), { status: 200, headers })
    }
  }

  const results: any[] = []
  let created = 0
  let updated = 0
  const errors: any[] = []

  for (let idx = 0; idx < items.length; idx++) {
    const raw = items[idx]
    // normalization
    const norm = {
      externalId: raw.externalId?.trim(),
      article: normalizeArticle(raw.article),
      brand: normalizeBrand(raw.brand),
      name: raw.name.trim(),
      description: raw.description?.trim(),
      price: raw.price,
      retailPrice: raw.retailPrice,
      stock: typeof raw.stock === 'number' ? raw.stock : undefined,
      weight: raw.weight,
      dimensions: raw.dimensions?.trim(),
      images: (raw.images || []).map((u) => String(u).trim()).filter(Boolean),
      categories: (raw.categories || []).map((c) => c.trim()).filter(Boolean),
      characteristics: raw.characteristics || {},
      isVisible: typeof raw.isVisible === 'boolean' ? raw.isVisible : undefined,
    }

    const itemKey = norm.externalId ? { externalId: norm.externalId } : { article: norm.article, brand: norm.brand }

    try {
      // find product by preferred key: externalId -> (article,brand)
      let product = norm.externalId
        ? await prisma.product.findUnique({ where: { externalId: norm.externalId }, include: { images: true, categories: true, characteristics: { include: { characteristic: true } } } })
        : null
      if (!product) {
        product = await prisma.product.findFirst({
          where: { article: norm.article || undefined, brand: norm.brand || undefined },
          include: { images: true, categories: true, characteristics: { include: { characteristic: true } } },
        })
      }

      const isNew = !product
      if (!product) {
        // slug prefer article-brand, fallback to name
        const baseSlug = norm.article ? `${norm.article}-${norm.brand}` : norm.name
        const slug = await makeUniqueSlug(baseSlug)

        product = await prisma.product.create({
          data: {
            name: norm.name,
            slug,
            article: norm.article || undefined,
            brand: norm.brand || undefined,
            externalId: norm.externalId,
            description: norm.description,
            retailPrice: norm.retailPrice ?? norm.price,
            wholesalePrice: norm.price,
            stock: norm.stock ?? 0,
            weight: norm.weight,
            dimensions: norm.dimensions,
            isVisible: norm.isVisible ?? true,
          },
          include: { images: true, categories: true, characteristics: { include: { characteristic: true } } },
        })
      } else {
        // partial update
        const updateData: any = {}
        if (norm.name) updateData.name = norm.name
        if (norm.externalId && !product.externalId) updateData.externalId = norm.externalId
        if (norm.description !== undefined) updateData.description = norm.description
        if (norm.retailPrice !== undefined) updateData.retailPrice = norm.retailPrice
        if (norm.price !== undefined) updateData.wholesalePrice = norm.price
        if (norm.stock !== undefined) updateData.stock = norm.stock
        if (norm.weight !== undefined) updateData.weight = norm.weight
        if (norm.dimensions !== undefined) updateData.dimensions = norm.dimensions
        if (norm.isVisible !== undefined) updateData.isVisible = norm.isVisible

        if (Object.keys(updateData).length) {
          product = await prisma.product.update({ where: { id: product.id }, data: updateData, include: { images: true, categories: true, characteristics: { include: { characteristic: true } } } })
        }
      }

      // sync categories (create path like A/B/C)
      if (norm.categories?.length) {
        const allCatIds: string[] = []
        for (const path of norm.categories) {
          const parts = path.split('/').map(p => p.trim()).filter(Boolean)
          let parentId: string | undefined
          for (const part of parts) {
            const slug = slugify(part)
            let cat = await prisma.category.findFirst({ where: { slug } })
            if (!cat) {
              cat = await prisma.category.create({ data: { name: part, slug, parentId } })
            }
            parentId = cat.id
            allCatIds.push(cat.id)
          }
        }
        // connect set
        await prisma.product.update({ where: { id: product.id }, data: { categories: { set: [], connect: [...new Set(allCatIds)].map(id => ({ id })) } } })
      }

      // sync images (replace with provided set if provided)
      if (norm.images) {
        const existing = await prisma.productImage.findMany({ where: { productId: product.id } })
        const wanted = norm.images
        const toDelete = existing.filter(e => !wanted.includes(e.url))
        for (const del of toDelete) {
          await prisma.productImage.delete({ where: { id: del.id } })
        }
        // upsert/create in order
        for (let i = 0; i < wanted.length; i++) {
          const url = wanted[i]
          const found = existing.find(e => e.url === url)
          if (found) {
            if (found.order !== i) {
              await prisma.productImage.update({ where: { id: found.id }, data: { order: i } })
            }
          } else {
            await prisma.productImage.create({ data: { productId: product.id, url, order: i } })
          }
        }
      }

      // sync characteristics
      if (norm.characteristics && Object.keys(norm.characteristics).length) {
        for (const [key, value] of Object.entries(norm.characteristics)) {
          const name = key.trim()
          const val = String(value).trim()
          if (!name) continue
          let ch = await prisma.characteristic.findFirst({ where: { name } })
          if (!ch) ch = await prisma.characteristic.create({ data: { name } })
          // upsert ProductCharacteristic by unique (productId, characteristicId)
          const existing = await prisma.productCharacteristic.findFirst({ where: { productId: product.id, characteristicId: ch.id } })
          if (existing) {
            if (existing.value !== val) {
              await prisma.productCharacteristic.update({ where: { id: existing.id }, data: { value: val } })
            }
          } else {
            await prisma.productCharacteristic.create({ data: { productId: product.id, characteristicId: ch.id, value: val } })
          }
        }
      }

      results.push({ key: itemKey, status: isNew ? 'created' : 'updated', id: product.id })
      if (isNew) created++; else updated++
    } catch (e: any) {
      const err = { key: itemKey, index: idx, error: e?.message || String(e) }
      errors.push(err)
      results.push({ key: itemKey, status: 'error', error: err.error })
      if (strict) {
        const body = { ok: false, created, updated, failed: errors.length, errors, items: results, requestId: reqId }
        // store in idem cache if key provided
        if (cacheKey) idemCache.set(cacheKey, { body, expiresAt: Date.now() + 10 * 60_000 })
        return new Response(JSON.stringify(body), { status: 422, headers })
      }
    }
  }

  const status = errors.length ? 207 : 200
  const body = { ok: errors.length === 0, created, updated, failed: errors.length, errors, items: results, requestId: reqId }
  // store in idem cache if provided
  if (cacheKey) idemCache.set(cacheKey, { body, expiresAt: Date.now() + 10 * 60_000 })
  return new Response(JSON.stringify(body), { status, headers })
}

async function makeUniqueSlug(base: string): Promise<string> {
  let slug = slugify(base)
  if (!slug) slug = 'product'
  let attempt = 0
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`
    const exists = await prisma.product.findFirst({ where: { slug: candidate }, select: { id: true } })
    if (!exists) return candidate
    attempt++
  }
}
