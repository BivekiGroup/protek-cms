import { NextRequest, NextResponse } from 'next/server'
import { fetchOzonPage, searchProductsByOEM } from '@/lib/ozon'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const last_id = searchParams.get('last_id') || ''
    const limitParam = parseInt(searchParams.get('limit') || '30', 10)

    const page = await fetchOzonPage({ q, last_id, limit: limitParam })
    return NextResponse.json(page)
  } catch (error) {
    console.error('Ozon search error', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
