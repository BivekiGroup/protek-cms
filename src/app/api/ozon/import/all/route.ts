import { NextRequest, NextResponse } from 'next/server'
import { fetchOzonPage } from '@/lib/ozon'

type ImportItem = {
  id: string
  name: string
  brand?: string
  oem?: string
  price?: number
  images: string[]
  attributes?: Record<string, string>
  mode?: 'new' | 'auto' | 'update'
}

export async function POST(request: NextRequest) {
  try {
    const { q, mode = 'auto', maxPages = 200, batchSize = 30 } = await request.json().catch(() => ({} as any))

    if (!['new', 'auto', 'update'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    let last_id: string | undefined = ''
    let page = 0
    let totalImported = 0
    let totalProcessed = 0
    let created = 0
    let updated = 0
    let failed = 0

    while (page < maxPages) {
      page += 1
      const resp = await fetchOzonPage({ q, last_id, limit: batchSize })
      const items = resp.items || []
      if (!items.length) break

      // Map to import payload
      const payload: { items: ImportItem[] } = {
        items: items.map((i: any) => ({
          id: String(i.id),
          name: i.name,
          brand: i.brand,
          oem: i.oem,
          price: i.price,
          images: Array.isArray(i.images) ? i.images : [],
          attributes: i.attributes || {},
          mode,
        }))
      }

      const url = new URL('/api/ozon/import', request.url).toString()
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        failed += payload.items.length
      } else {
        const results = Array.isArray(json?.results) ? json.results : []
        totalProcessed += results.length
        created += results.filter((r: any) => r.status === 'created').length
        updated += results.filter((r: any) => r.status === 'updated').length
        failed += results.filter((r: any) => r.status === 'error').length
        totalImported += created + updated
      }

      last_id = resp.last_id
      if (!last_id) break
    }

    return NextResponse.json({
      success: true,
      summary: { totalProcessed, created, updated, failed }
    })
  } catch (error: any) {
    console.error('Ozon import all error:', error)
    return NextResponse.json({ error: error?.message || 'Import all failed' }, { status: 500 })
  }
}

