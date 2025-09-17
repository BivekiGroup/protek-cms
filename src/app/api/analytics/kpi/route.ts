import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const now = Date.now()
    const d1 = new Date(now - 1 * 24 * 60 * 60 * 1000)
    const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000)

    const [
      search1, search7, search30,
      views1, views7, views30
    ] = await Promise.all([
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_search_events" where "createdAt" >= ${d1}`,
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_search_events" where "createdAt" >= ${d7}`,
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_search_events" where "createdAt" >= ${d30}`,
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_product_views" where "createdAt" >= ${d1}`,
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_product_views" where "createdAt" >= ${d7}`,
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_product_views" where "createdAt" >= ${d30}`,
    ])

    const n = (x: any) => Number(x?.[0]?.c || 0)
    return new Response(JSON.stringify({
      search: { d1: n(search1), d7: n(search7), d30: n(search30) },
      views: { d1: n(views1), d7: n(views7), d30: n(views30) },
    }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500 })
  }
}
