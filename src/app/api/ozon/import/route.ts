import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadBuffer, generateFileKey } from '@/lib/s3'

type ImportItem = {
  id?: string
  name: string
  brand?: string
  oem?: string
  price?: number
  description?: string
  images: string[]
  attributes?: Record<string, string>
  mode?: 'new' | 'update' | 'auto'
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0400-\u04FF]+/g, '-') // keep cyrillic
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const array = await res.arrayBuffer()
    return Buffer.from(array)
  } catch (e) {
    console.error('Image download failed:', url, e)
    return null
  }
}

// Ozon helpers to fetch attributes and extra fields
const OZON_BASE_URL = 'https://api-seller.ozon.ru'

async function ozonCall<T = any>(path: string, body: any): Promise<T> {
  const clientId = process.env.OZON_CLIENT_ID
  const apiKey = process.env.OZON_API_KEY
  if (!clientId || !apiKey) throw new Error('Ozon credentials are not configured')
  const res = await fetch(`${OZON_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ozon API error ${res.status}: ${text || res.statusText}`)
  }
  return res.json() as Promise<T>
}

type AttrValue = { id: number; values?: { value: string }[] }
type AttrItem = {
  id: number
  description_category_id?: number
  attributes?: AttrValue[]
  height?: number
  depth?: number
  width?: number
  dimension_unit?: string
  weight?: number
  weight_unit?: string
}

// Important: product_id in Ozon is int64; keep it as string to avoid JS precision loss
async function getOzonAttributes(productId: string): Promise<AttrItem | null> {
  try {
    const res = await ozonCall<{ result: AttrItem[] }>(
      '/v4/product/info/attributes',
      { filter: { product_id: [productId], visibility: 'ALL' }, limit: 1 }
    )
    return res?.result?.[0] || null
  } catch {
    return null
  }
}

type CategoryAttributesResponse = { result: { id: number; name: string }[] }
async function getCategoryAttrNames(description_category_id?: number): Promise<Map<number, string> | null> {
  if (!description_category_id) return null
  try {
    const res = await ozonCall<CategoryAttributesResponse>('/v1/description-category/attribute', { description_category_id })
    const map = new Map<number, string>()
    for (const a of res?.result || []) map.set(a.id, a.name)
    return map
  } catch {
    return null
  }
}

function pickAttrValue(attrs: AttrValue[] | undefined, id: number): string | undefined {
  const found = (attrs || []).find(a => a.id === id)
  if (!found) return undefined
  const val = (found.values || []).map(v => (v?.value || '').trim()).filter(Boolean).join(', ')
  return val || undefined
}

function extractDescription(attrs: AttrValue[] | undefined): string | undefined {
  // Common long-text attributes: 4191, 4180
  const ids = [4191, 4180]
  for (const id of ids) {
    const v = pickAttrValue(attrs, id)
    if (v) return v
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const items: ImportItem[] = Array.isArray(body?.items) ? body.items : []
    if (!items.length) return NextResponse.json({ error: 'No items' }, { status: 400 })

    const results: { externalId?: string; createdId?: string; updatedId?: string; status: string; message?: string }[] = []

    for (const raw of items) {
      try {
        const article = (raw.oem || '').trim() || undefined
        const name = (raw.name || '').trim()
        if (!name) throw new Error('Item name is required')

        // Fetch Ozon attributes/dimensions/weight if product_id known
        const productId = raw.id ? String(raw.id) : undefined
        const ozonAttrs = productId ? await getOzonAttributes(productId) : null

        // Extract brand/OEM/description from attributes when available
        // Brand detection: prefer known IDs, then by attribute name mapping
        const brandById = ozonAttrs?.attributes ? (pickAttrValue(ozonAttrs.attributes, 85) || pickAttrValue(ozonAttrs.attributes, 5076)) : undefined
        let effectiveBrand = brandById || raw.brand || undefined
        if (!effectiveBrand && ozonAttrs?.attributes) {
          const idMap = await getCategoryAttrNames(ozonAttrs.description_category_id)
          if (idMap) {
            for (const a of ozonAttrs.attributes) {
              const name = (idMap.get(a.id) || '').toLowerCase()
              if (!name) continue
              if (name.includes('бренд') || name.includes('производител') || name.includes('марка') || name.includes('brand') || name.includes('manufacturer')) {
                const v = (a.values || []).map(v => (v?.value || '').trim()).filter(Boolean).join(', ')
                if (v) { effectiveBrand = v; break }
              }
            }
          }
        }

        // OEM detection: prefer known ID, else fallback by name later
        const oemById = ozonAttrs?.attributes ? pickAttrValue(ozonAttrs.attributes, 7236) : undefined
        const effectiveArticle = (oemById || article) || undefined
        const description = extractDescription(ozonAttrs?.attributes) || raw.description || undefined

        // Dimensions and weight mapping
        let weightKg: number | undefined = undefined
        if (typeof ozonAttrs?.weight === 'number') {
          if ((ozonAttrs.weight_unit || '').toLowerCase() === 'g') weightKg = ozonAttrs.weight / 1000
          else if ((ozonAttrs.weight_unit || '').toLowerCase() === 'kg') weightKg = ozonAttrs.weight
        }
        let dimStr: string | undefined = undefined
        if (typeof ozonAttrs?.height === 'number' && typeof ozonAttrs?.width === 'number' && typeof ozonAttrs?.depth === 'number') {
          const unit = (ozonAttrs.dimension_unit || '').toLowerCase()
          let h = ozonAttrs.height, w = ozonAttrs.width, d = ozonAttrs.depth
          if (unit === 'mm') { h = h / 10; w = w / 10; d = d / 10 } // мм → см
          else if (unit === 'cm') { /* ok */ }
          // Формируем ДхШхВ
          const fmt = (x: number) => (Math.round(x * 10) / 10).toString()
          dimStr = `${fmt(d)}x${fmt(w)}x${fmt(h)}`
        }

        // Find existing by article if present and mode says update/auto
        let existing = null as null | { id: string; article: string | null }
        if (effectiveArticle && (raw.mode === 'update' || raw.mode === 'auto')) {
          existing = await prisma.product.findUnique({ where: { article: effectiveArticle } })
        }

        // Upload multiple images to S3 (up to 8)
        const uploadedImages: { url: string; alt?: string; order?: number }[] = []
        const maxImages = 8
        for (let i = 0; i < Math.min(raw.images?.length || 0, maxImages); i++) {
          const u = raw.images[i]
          if (!u) continue
          const buffer = await fetchImageBuffer(u)
          if (!buffer) continue
          const key = generateFileKey(`ozon-${Date.now()}-${i}.jpg`, 'products')
          const uploaded = await uploadBuffer(buffer, key, 'image/jpeg')
          uploadedImages.push({ url: uploaded.url, alt: name, order: i })
        }

        // Characteristics (attributes) mapping
        // Do not import characteristics — keep empty per requirements

        if (existing) {
          // Update existing product
          const updateData: any = {
            name,
            brand: effectiveBrand || null,
            retailPrice: raw.price ?? undefined,
            description: description ?? undefined,
            article: effectiveArticle,
            weight: typeof weightKg === 'number' ? weightKg : undefined,
            dimensions: dimStr,
          }

          await prisma.$transaction(async (tx) => {
            await tx.product.update({ where: { id: existing!.id }, data: updateData })
            await tx.productImage.deleteMany({ where: { productId: existing!.id } })
            if (uploadedImages.length) {
              await tx.productImage.createMany({
                data: uploadedImages.map((img) => ({ ...img, productId: existing!.id })),
              })
            }
            // Clear any previous characteristics to keep empty
            await tx.productCharacteristic.deleteMany({ where: { productId: existing!.id } })
          })

          results.push({ externalId: raw.id, updatedId: existing.id, status: 'updated' })
        } else {
          // Create new product
          const slug = slugify(name)
          const product = await prisma.product.create({
            data: {
              name,
              slug,
              article: effectiveArticle,
              brand: effectiveBrand || null,
              retailPrice: raw.price ?? null,
              description: description ?? null,
              weight: typeof weightKg === 'number' ? weightKg : null,
              dimensions: dimStr || null,
              images: {
                create: uploadedImages.map((img, idx) => ({ url: img.url, alt: img.alt || name, order: img.order ?? idx })),
              },
            },
          })

          // Do not create characteristics — leave empty

          results.push({ externalId: raw.id, createdId: product.id, status: 'created' })
        }
      } catch (e: any) {
        results.push({ externalId: raw?.id, status: 'error', message: e?.message || 'Import failed' })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Ozon import error', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
