import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { uploadBuffer } from '@/lib/s3'

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

function isLikelyCuid(value: string) {
  return /^[a-z0-9]+$/i.test(value) && value.length >= 24
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

const base64ImageObjectSchema = z.object({
  filename: z.string().trim().min(1),
  content: z.string().trim().min(1), // base64 string or data URL
  contentType: z.string().trim().optional(),
})

const productItemSchema = z.object({
  id: z.string().trim().min(1).optional(),
  product_id: z.string().trim().min(1).optional(),
  externalId: z.string().trim().min(1).optional(),
  article: z.string().trim().min(1),
  brand: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  price: z.number().finite().nonnegative().optional(), // продажная цена
  stock: z.number().int().optional(),
  weight: z.number().finite().nonnegative().optional(),
  dimensions: z.string().trim().optional(),
  depth: z.number().finite().nonnegative().optional(),
  width: z.number().finite().nonnegative().optional(),
  height: z.number().finite().nonnegative().optional(),
  images: z.array(z.string().url()).optional(),
  // New: 1C can send images as base64 strings or objects { filename, content, contentType }
  images_base64: z
    .array(z.union([z.string().min(1), base64ImageObjectSchema]))
    .optional(),
  category_code: z.string().trim().min(1),
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
  // maxBatch: 0 or unset means no limit
  const maxBatchRaw = process.env.ONEC_MAX_BATCH_SIZE
  const maxBatch = Number(maxBatchRaw ?? 0) || 0
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
  if (maxBatch > 0 && items.length > maxBatch) {
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
  const productInclude = {
    images: true,
    categories: true,
    characteristics: { include: { characteristic: true } },
  } as const

  for (let idx = 0; idx < items.length; idx++) {
    const raw = items[idx]
    // normalization
    const rawId = raw.id?.trim()
    const rawIdLooksLikeDbId = rawId ? isLikelyCuid(rawId) : false
    const rawProductIdValue = raw.product_id
    const rawProductId = rawProductIdValue === undefined || rawProductIdValue === null
      ? undefined
      : String(rawProductIdValue).trim()
    const productIdFromPayload = rawProductId ? rawProductId : undefined
    const normOnecProductId = productIdFromPayload || (!rawIdLooksLikeDbId ? rawId : undefined)

    const norm = {
      id: rawIdLooksLikeDbId ? rawId : undefined,
      onecProductId: normOnecProductId,
      externalId: raw.externalId?.trim(),
      article: normalizeArticle(raw.article),
      brand: normalizeBrand(raw.brand),
      name: raw.name.trim(),
      description: raw.description?.trim(),
      price: raw.price,
      stock: typeof raw.stock === 'number' ? raw.stock : undefined,
      weight: raw.weight,
      dimensions: raw.dimensions?.trim(),
      depth: raw.depth,
      width: raw.width,
      height: raw.height,
      images: (raw.images || []).map((u) => String(u).trim()).filter(Boolean),
      images_base64: Array.isArray(raw.images_base64) ? raw.images_base64 : undefined,
      category_code: raw.category_code?.trim(),
      characteristics: raw.characteristics || {},
      isVisible: typeof raw.isVisible === 'boolean' ? raw.isVisible : undefined,
    }

    const rawArticleTrimmed = raw.article?.trim()
    const rawBrandTrimmed = raw.brand?.trim()
    const articleVariants = Array.from(
      new Set(
        [
          norm.article,
          rawArticleTrimmed,
          rawArticleTrimmed ? normalizeArticle(rawArticleTrimmed) : undefined,
        ].filter(Boolean)
      )
    ) as string[]
    const brandVariants = Array.from(
      new Set(
        [
          norm.brand,
          rawBrandTrimmed,
          rawBrandTrimmed ? normalizeBrand(rawBrandTrimmed) : undefined,
        ].filter(Boolean)
      )
    ) as string[]
    const articleFilters = articleVariants.map(article => ({
      article: { equals: article, mode: 'insensitive' as const },
    }))
    const brandVariantSet = new Set(brandVariants.map(value => normalizeBrand(value)))

    // externalId по умолчанию: article + '_' + brand в нижнем регистре
    if (!norm.externalId && norm.article && norm.brand) {
      norm.externalId = `${norm.article.toLowerCase()}_${norm.brand.toLowerCase()}`
    }

    const itemKey = norm.id
      ? { id: norm.id }
      : norm.onecProductId
        ? { product_id: norm.onecProductId }
        : norm.externalId
          ? { externalId: norm.externalId }
          : { article: norm.article, brand: norm.brand }

    try {
      // find product by preferred key: product_id -> id -> externalId -> (article,brand)
      let product: Awaited<ReturnType<typeof prisma.product.findUnique>> | Awaited<ReturnType<typeof prisma.product.findFirst>> | null = null
      if (norm.onecProductId) {
        product = await prisma.product.findUnique({
          where: { onecProductId: norm.onecProductId },
          include: productInclude,
        })
      }

      if (!product && norm.id) {
        product = await prisma.product.findUnique({
          where: { id: norm.id },
          include: productInclude,
        })
      }

      if (!product && norm.externalId) {
        product = await prisma.product.findUnique({
          where: { externalId: norm.externalId },
          include: productInclude,
        })
      }

      let matchesForArticleFull: any[] | null = null

      if (!product && articleVariants.length && brandVariants.length) {
        for (const article of articleVariants) {
          for (const brand of brandVariants) {
            const candidate = await prisma.product.findFirst({
              where: {
                article: { equals: article, mode: 'insensitive' as const },
                brand: { equals: brand, mode: 'insensitive' as const },
              },
              include: productInclude,
              orderBy: { createdAt: 'asc' },
            })
            if (candidate) {
              product = candidate
              break
            }
          }
          if (product) break
        }
      }

      if (!product && articleFilters.length) {
        matchesForArticleFull = await prisma.product.findMany({
          where: { OR: articleFilters },
          include: productInclude,
          orderBy: { createdAt: 'asc' },
        })
        if (matchesForArticleFull.length) {
          const byOnecId = norm.onecProductId
            ? matchesForArticleFull.find(m => m.onecProductId && String(m.onecProductId).trim() === norm.onecProductId)
            : null
          const byExternalId = !byOnecId && norm.externalId
            ? matchesForArticleFull.find(m => (m.externalId || '').trim() === norm.externalId)
            : null
          const byBrand = matchesForArticleFull.find(m => m.brand && brandVariantSet.has(normalizeBrand(m.brand)))
          product = byOnecId || byExternalId || byBrand || matchesForArticleFull[0]
        }
      }

      if (product && articleFilters.length) {
        const matchesIds =
          matchesForArticleFull?.map(m => m.id) ??
          (await prisma.product.findMany({
            where: { OR: articleFilters },
            select: { id: true },
          })).map(m => m.id)
        const duplicatesToRemove = matchesIds.filter(id => id !== product!.id)
        if (duplicatesToRemove.length) {
          await prisma.product.deleteMany({ where: { id: { in: duplicatesToRemove } } })
        }
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
            onecProductId: norm.onecProductId,
            description: norm.description,
            retailPrice: norm.price,
            stock: norm.stock ?? 0,
            weight: norm.weight,
            dimensions: norm.dimensions,
            depth: norm.depth,
            width: norm.width,
            height: norm.height,
            isVisible: norm.isVisible ?? true,
          },
          include: productInclude,
        })
      } else {
        // partial update
        const updateData: any = {}
        if (norm.article && product.article !== norm.article) updateData.article = norm.article
        if (norm.brand && product.brand !== norm.brand) updateData.brand = norm.brand
        if (norm.name) updateData.name = norm.name
        if (norm.externalId && !product.externalId) updateData.externalId = norm.externalId
        if (norm.description !== undefined) updateData.description = norm.description
        if (norm.price !== undefined) updateData.retailPrice = norm.price
        if (norm.stock !== undefined) updateData.stock = norm.stock
        if (norm.weight !== undefined) updateData.weight = norm.weight
        if (norm.dimensions !== undefined) updateData.dimensions = norm.dimensions
        if (norm.depth !== undefined) updateData.depth = norm.depth
        if (norm.width !== undefined) updateData.width = norm.width
        if (norm.height !== undefined) updateData.height = norm.height
        if (norm.isVisible !== undefined) updateData.isVisible = norm.isVisible
        if (norm.onecProductId && norm.onecProductId !== product.onecProductId) updateData.onecProductId = norm.onecProductId

        if (Object.keys(updateData).length) {
          product = await prisma.product.update({ where: { id: product.id }, data: updateData, include: productInclude })
        }
      }

      // If base64 images provided — upload them to S3 and replace images with uploaded URLs
      if (norm.images_base64 && norm.images_base64.length > 0) {
        try {
          const uploadedUrls: string[] = []
          for (const img of norm.images_base64 as Array<string | z.infer<typeof base64ImageObjectSchema>>) {
            const parsed = await parseBase64Image(img)
            if (!parsed) continue
            const key = buildProductImageKey(norm.article || norm.onecProductId || norm.externalId || 'unknown', parsed.extension)
            const res = await uploadBuffer(parsed.buffer, key, parsed.contentType).catch(() => null as any)
            const url = (typeof res === 'string' ? res : res?.url) || null
            if (url) uploadedUrls.push(url)
          }
          if (uploadedUrls.length) {
            norm.images = uploadedUrls
          }
        } catch {}
      }

      // link product to category by category_code (required)
      if (norm.category_code) {
        // ensure category exists
        let cat = await prisma.category.findFirst({ where: { code: norm.category_code } })
        if (!cat) {
          // create minimal category with code as name+slug
          const name = norm.category_code
          cat = await prisma.category.create({ data: { name, slug: slugify(name), code: norm.category_code } })
        }
        await prisma.product.update({ where: { id: product.id }, data: { categories: { set: [{ id: cat.id }] } } })
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

      results.push({ key: itemKey, status: isNew ? 'created' : 'updated', id: product.id, product_id: product.onecProductId })
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

// Helpers for base64 image parsing and S3 key building
function detectExtFromContentType(ct?: string | null): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  }
  return (ct && map[ct.toLowerCase()]) || 'jpg'
}

function extFromFilename(name?: string | null): string | null {
  if (!name) return null
  const m = String(name).trim().match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : null
}

async function parseBase64Image(
  img: string | { filename: string; content: string; contentType?: string }
): Promise<{ buffer: Buffer; contentType: string; extension: string } | null> {
  try {
    let filename = ''
    let content = ''
    let contentType: string | undefined
    if (typeof img === 'string') {
      // Can be data URL or raw base64 – try to detect
      const m = img.match(/^data:([^;]+);base64,(.+)$/i)
      if (m) {
        contentType = m[1]
        content = m[2]
      } else {
        // Unknown type, assume jpeg
        contentType = 'image/jpeg'
        content = img
      }
    } else {
      filename = img.filename || ''
      content = img.content || ''
      if (/^data:/i.test(content)) {
        const m = content.match(/^data:([^;]+);base64,(.+)$/i)
        if (m) { contentType = img.contentType || m[1]; content = m[2] }
      } else {
        contentType = img.contentType || undefined
      }
    }
    const buf = Buffer.from(content, 'base64')
    if (!buf || buf.length === 0) return null
    let ext = extFromFilename(filename)
    if (!ext) ext = detectExtFromContentType(contentType)
    const ct = contentType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg')
    return { buffer: buf, contentType: ct, extension: ext || 'jpg' }
  } catch {
    return null
  }
}

function buildProductImageKey(articleOrId: string, ext: string): string {
  const safe = (articleOrId || 'unknown').toString().replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()
  const stamp = Date.now()
  const rnd = Math.random().toString(36).slice(2, 8)
  return `products/images/${safe}/${stamp}-${rnd}.${ext || 'jpg'}`
}
