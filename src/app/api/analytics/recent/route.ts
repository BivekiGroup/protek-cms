import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || '20')))
    const [searches, views] = await Promise.all([
      prisma.searchEvent.findMany({ orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, createdAt: true, query: true, brand: true, article: true, resultsCount: true, filters: true } }),
      prisma.productViewEvent.findMany({ orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, createdAt: true, productId: true, offerKey: true, brand: true, article: true, referrer: true } }),
    ])
    return NextResponse.json({ ok: true, searches, views })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}

