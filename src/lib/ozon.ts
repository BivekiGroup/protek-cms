// Lightweight Ozon Seller API client and helpers
// Real Ozon Seller API requires Client-Id and Api-Key.
// We support a mock mode when env keys are missing to allow UI development.

export type OzonSearchItem = {
  id: string
  name: string
  brand?: string
  oem?: string
  price?: number
  images: string[]
  attributes?: Record<string, string>
}

export type OzonSearchPage = {
  items: OzonSearchItem[]
  last_id?: string
  total?: number
}

const OZON_BASE_URL = 'https://api-seller.ozon.ru'

function hasOzonCreds() {
  return Boolean(process.env.OZON_CLIENT_ID && process.env.OZON_API_KEY)
}

async function callOzon<T = any>(path: string, body: any): Promise<T> {
  if (!hasOzonCreds()) {
    throw new Error('Ozon credentials are not configured')
  }

  const res = await fetch(`${OZON_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Client-Id': process.env.OZON_CLIENT_ID as string,
      'Api-Key': process.env.OZON_API_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
    // Next.js route handlers run on server; no cache for dynamic data
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ozon API error ${res.status}: ${text || res.statusText}`)
  }
  return res.json() as Promise<T>
}

async function callOzonFallback<T = any>(paths: string[], body: any): Promise<T> {
  let lastError: unknown = null
  for (const p of paths) {
    try {
      return await callOzon<T>(p, body)
    } catch (e: any) {
      lastError = e
      // If path not found, try next
      if (String(e?.message || '').includes('404')) continue
      // For other errors, break
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Ozon API call failed')
}

type OzonListItem = {
  product_id: number
  offer_id: string
  sku?: number
  archived?: boolean
}

type OzonProductListResponse = {
  result: {
    items: OzonListItem[]
    total: number
    last_id: string
  }
}

type OzonProductInfoItem = {
  id: number // product_id
  name: string
  offer_id: string
  images?: string[]
  primary_image?: string
  sku?: number
  attributes?: { id: number; values?: { value: string }[] }[]
  description_category_id?: number
  price?: string
  old_price?: string
  marketing_price?: string
  currency_code?: string
}

type OzonProductInfoListResponse = {
  items: OzonProductInfoItem[]
}

type OzonAttributesItem = {
  id: number // product_id
  description_category_id?: number
  attributes?: { id: number; values?: { value: string }[] }[]
}

type OzonAttributesResponse = {
  result: OzonAttributesItem[]
}

async function listSellerProductsPage(limit = 30, last_id = ''): Promise<{ items: OzonListItem[]; last_id?: string; total?: number }>
{
  const body = {
    filter: { visibility: 'ALL' },
    last_id,
    limit,
  }
  // Try v3 first (current), then fallbacks
  let res: OzonProductListResponse | null = null
  try {
    res = await callOzon<OzonProductListResponse>('/v3/product/list', body)
  } catch (_) {
    // fallback bodies and versions
    const tryBodies = [
      { filter: { visibility: 'ALL' }, last_id, limit },
      { filter: { visibility: 'ALL' }, last_id, page_size: limit as unknown as number },
    ] as const
    for (const b of tryBodies) {
      try {
        res = await callOzonFallback<OzonProductListResponse>(['/v2/product/list', '/v1/product/list'], b)
        break
      } catch (_) {}
    }
  }
  if (!res) throw new Error('Failed to fetch Ozon product list')
  return {
    items: res.result.items || [],
    last_id: res.result.last_id,
    total: res.result.total,
  }
}

async function getProductsInfoList(productIds: number[]): Promise<OzonProductInfoItem[]> {
  if (!productIds.length) return []
  const chunk = <T,>(arr: T[], size: number) => arr.reduce<T[][]>((acc, cur) => {
    const last = acc[acc.length - 1]
    if (!last || last.length >= size) acc.push([cur])
    else last.push(cur)
    return acc
  }, [])
  const chunks = chunk(productIds, 200)
  const all: OzonProductInfoItem[] = []
  for (const part of chunks) {
    try {
      const res = await callOzon<OzonProductInfoListResponse>('/v3/product/info/list', { product_id: part.map(String) })
      all.push(...(res.items || []))
    } catch (e) {
      // fallback: try v2 product/info by single id if v3 is not available
      for (const pid of part) {
        try {
          const single = await callOzonFallback<{ result: OzonProductInfoItem }>(['/v2/product/info', '/v1/product/info'], { product_id: pid })
          if (single?.result) all.push(single.result)
        } catch (_) {}
      }
    }
  }
  return all
}

async function getProductsAttributes(productIds: number[]): Promise<Map<number, OzonAttributesItem>> {
  const result = new Map<number, OzonAttributesItem>()
  if (!productIds.length) return result
  const chunk = <T,>(arr: T[], size: number) => arr.reduce<T[][]>((acc, cur) => {
    const last = acc[acc.length - 1]
    if (!last || last.length >= size) acc.push([cur])
    else last.push(cur)
    return acc
  }, [])
  const chunks = chunk(productIds, 200)
  for (const part of chunks) {
    try {
      const res = await callOzon<OzonAttributesResponse>('/v4/product/info/attributes', {
        filter: { product_id: part.map(String), visibility: 'ALL' },
        limit: part.length,
      })
      for (const item of res.result || []) {
        result.set(item.id, item)
      }
    } catch (_) {
      // ignore and continue
    }
  }
  return result
}

function extractAttributesMap(attrs?: OzonProductInfoItem['attributes']): Record<string, string> {
  const map: Record<string, string> = {}
  for (const a of attrs || []) {
    const key = `attr_${a.id}`
    const val = (a.values || []).map(v => (v?.value || '').trim()).filter(Boolean).join(', ')
    if (key && val) map[key] = val
  }
  return map
}

function findOEM(attrs: Record<string, string>, offer_id?: string, name?: string, brand?: string): string | undefined {
  // Prefer attribute names that commonly represent manufacturer part numbers
  const preferredNames = [
    'Артикул производителя', 'Номер производителя', 'OEM', 'ОЕМ',
    'Manufacturer Part Number', 'MPN', 'Part Number', 'Номер детали', 'Каталожный номер', 'ОЕМ номер', 'Оригинальный номер', 'Код производителя',
  ]
  for (const key of Object.keys(attrs)) {
    const lower = key.toLowerCase()
    if (preferredNames.some(p => lower.includes(p.toLowerCase()))) {
      const v = attrs[key]
      if (v) return v.trim()
    }
  }
  // Then try to detect OEM-like tokens in attribute values (exclude brand/name duplicates)
  for (const [k, v] of Object.entries(attrs)) {
    if (!v) continue
    if (brand && v === brand) continue
    if (name && v === name) continue
    if (/[A-Z0-9][A-Z0-9-_.]{3,}/i.test(v) && v.length <= 64) return v.trim()
  }
  // As a last resort, fall back to offer_id
  if (offer_id && /[a-z0-9]/i.test(offer_id)) return offer_id
  // Fallback: if name is a compact code-like token (no spaces), use it
  if (name && /^[A-Za-z0-9][A-Za-z0-9_.-]{2,}$/.test(name) && !name.includes(' ')) return name
  return undefined
}

// === Attributes naming helpers ===
type CategoryAttributesResponse = {
  result: { id: number; name: string }[]
}

const categoryAttrCache = new Map<number, Map<number, string>>()

// Known attribute IDs in Ozon frequently used across categories
// 85: Brand, 7236: OEM/Manufacturer code (based on your example)
const BRAND_ATTR_IDS = [85]
const OEM_ATTR_IDS = [7236]

async function getCategoryAttrNames(descCategoryId?: number): Promise<Map<number, string> | null> {
  if (!descCategoryId) return null
  if (categoryAttrCache.has(descCategoryId)) return categoryAttrCache.get(descCategoryId) || null
  try {
    const res = await callOzon<CategoryAttributesResponse>('/v1/description-category/attribute', {
      description_category_id: descCategoryId,
    })
    const map = new Map<number, string>()
    for (const a of res?.result || []) map.set(a.id, a.name)
    categoryAttrCache.set(descCategoryId, map)
    return map
  } catch (_) {
    return null
  }
}

function mapAttributesByName(info: OzonProductInfoItem, idMap: Map<number, string> | null): Record<string, string> {
  const out: Record<string, string> = {}
  for (const a of info.attributes || []) {
    const name = (idMap?.get(a.id) || `attr_${a.id}`).trim()
    const val = (a.values || []).map(v => (v?.value || '').trim()).filter(Boolean).join(', ')
    if (name && val) out[name] = val
  }
  return out
}

function pickBrand(attrs: Record<string, string>): string | undefined {
  const brandKeys = [
    'Бренд', 'Производитель', 'Марка', 'Бренд товара', 'Торговая марка', 'Brand', 'Manufacturer', 'Производитель/бренд', 'Тематика'
  ]
  for (const k of brandKeys) {
    if (attrs[k]) return attrs[k]
  }
  // generic fallbacks by partial name
  for (const [k, v] of Object.entries(attrs)) {
    const lower = k.toLowerCase()
    if (lower.includes('бренд') || lower.includes('производитель') || lower.includes('марка')) return v
  }
  return undefined
}

function getAttrValueByIds(info: OzonProductInfoItem, ids: number[]): string | undefined {
  for (const a of info.attributes || []) {
    if (ids.includes(a.id)) {
      const val = (a.values || []).map(v => (v?.value || '').trim()).filter(Boolean).join(', ')
      if (val) return val
    }
  }
  return undefined
}

// Search products in Ozon by OEM/manufacturer article
// IMPORTANT: Ozon Seller API does not expose a direct public search-by-OEM endpoint.
// For now we assume you have a backend that maps OEM -> your Ozon SKUs or we rely on a future API.
// This function provides a mock fallback so UI remains usable.
export async function searchProductsByOEM(oem: string, options?: { showAll?: boolean; limit?: number; last_id?: string }): Promise<OzonSearchItem[]> {
  const query = (oem || '').trim()
  const showAll = options?.showAll || !query

  if (!hasOzonCreds() || process.env.OZON_MOCK === '1') {
    // Mock data for development
    return [
      {
        id: `mock-${query}-1`,
        name: `Товар для ${query} (пример)`,
        brand: 'OZONBRAND',
        oem: query.toUpperCase(),
        price: 1990,
        images: [
          'https://static.ozone.ru/multimedia/1019187813.jpg',
        ],
        attributes: {
          Цвет: 'Черный',
          Материал: 'Пластик',
        },
      },
      {
        id: `mock-${query}-2`,
        name: `Ещё один товар ${query}`,
        brand: 'BRANDX',
        oem: `${query}-B`,
        price: 2490,
        images: [
          'https://static.ozone.ru/multimedia/1019187814.jpg',
        ],
        attributes: {
          Вес: '0.4 кг',
        },
      },
    ]
  }

  // Real implementation: list your products, load details, filter by OEM/query
  const page = await listSellerProductsPage(options?.limit ?? 30, options?.last_id || '')
  const infos = await getProductsInfoList(page.items.map(i => i.product_id))

  const results: OzonSearchItem[] = []
  for (const info of infos) {
    const idMap = await getCategoryAttrNames(info.description_category_id)
    const attrs = mapAttributesByName(info, idMap)
    // brand by common attribute names if present
    const brand = attrs['Бренд'] || attrs['Производитель'] || attrs['Brand'] || attrs['Марка']
    const oemValue = findOEM(attrs, info.offer_id, info.name, brand)
    if (!showAll) {
      // match by OEM or in any attribute/name
      const haystack = [oemValue, info.name, info.offer_id, ...Object.values(attrs)].join(' ').toLowerCase()
      if (!haystack.includes(query.toLowerCase())) continue
    }

    results.push({
      id: String(info.id),
      name: info.name,
      brand: brand || undefined,
      oem: oemValue,
      price: undefined,
      images: info.images || (info.primary_image ? [info.primary_image] : []),
      attributes: attrs,
    })
  }
  return results
}

export async function fetchOzonPage(params: { q?: string; limit?: number; last_id?: string }): Promise<OzonSearchPage> {
  const limit = Math.max(1, Math.min(params.limit ?? 30, 100))
  const page = await listSellerProductsPage(limit, params.last_id || '')
  const infos = await getProductsInfoList(page.items.map(i => i.product_id))
  // Fallback: ensure attributes exist by fetching attributes endpoint if needed
  const missingAttrIds = infos.filter(i => !i.attributes || i.attributes.length === 0).map(i => i.id)
  let attrMap: Map<number, OzonAttributesItem> | null = null
  if (missingAttrIds.length) {
    attrMap = await getProductsAttributes(missingAttrIds)
  }
  const query = (params.q || '').trim().toLowerCase()
  const showAll = !query

  const enriched: OzonSearchItem[] = []
  for (const info of infos) {
    // Compose attributes (from info or fallback from attributes endpoint)
    let effectiveInfo = info
    if ((!info.attributes || info.attributes.length === 0) && attrMap?.has(info.id)) {
      const fallback = attrMap.get(info.id)!
      effectiveInfo = {
        ...info,
        attributes: fallback.attributes || [],
        description_category_id: info.description_category_id || fallback.description_category_id,
      }
    }
    const idMap = await getCategoryAttrNames(effectiveInfo.description_category_id)
    const attrs = mapAttributesByName(effectiveInfo, idMap)
    const brand = getAttrValueByIds(effectiveInfo, BRAND_ATTR_IDS) || pickBrand(attrs)
    const oemById = getAttrValueByIds(effectiveInfo, OEM_ATTR_IDS)
    const oemValue = oemById || findOEM(attrs, undefined /* do not prefer offer_id */, effectiveInfo.name, brand)
    if (!showAll) {
      const haystack = [oemValue, effectiveInfo.name, effectiveInfo.offer_id, brand, ...Object.values(attrs)].join(' ').toLowerCase()
      if (!haystack.includes(query)) continue
    }
    // price preference: price -> marketing_price -> old_price
    const priceStr = effectiveInfo.price || effectiveInfo.marketing_price || effectiveInfo.old_price
    const price = priceStr ? parseFloat(String(priceStr).replace(/\s+/g, '').replace(',', '.')) : undefined
    enriched.push({
      id: String(effectiveInfo.id),
      name: effectiveInfo.name,
      brand: brand || undefined,
      oem: oemValue,
      price: Number.isFinite(price as number) ? price : undefined,
      images: effectiveInfo.images || (effectiveInfo.primary_image ? [effectiveInfo.primary_image] : []),
      attributes: attrs,
    })
  }

  return { items: enriched, last_id: page.last_id, total: page.total }
}
