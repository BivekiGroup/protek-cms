import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const days = Number(url.searchParams.get('days') || '7')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [searchByDay, topQueries, topBrands, viewsByDay, topArticles] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        `select date_trunc('day', "createdAt") as d, count(*) as c from analytics_search_events where "createdAt" >= $1 group by 1 order by 1`,
        since
      ),
      prisma.$queryRawUnsafe<any[]>(
        `select lower(query) as q, count(*) as c from analytics_search_events where "createdAt" >= $1 group by 1 order by 2 desc limit 20`,
        since
      ),
      prisma.$queryRawUnsafe<any[]>(
        `select upper(coalesce(brand,'-')) as b, count(*) as c from analytics_search_events where "createdAt" >= $1 group by 1 order by 2 desc limit 20`,
        since
      ),
      prisma.$queryRawUnsafe<any[]>(
        `select date_trunc('day', "createdAt") as d, count(*) as c from analytics_product_views where "createdAt" >= $1 group by 1 order by 1`,
        since
      ),
      prisma.$queryRawUnsafe<any[]>(
        `select upper(coalesce(brand,'-')) as b, coalesce(article,'-') as a, count(*) as c from analytics_product_views where "createdAt" >= $1 group by 1,2 order by 3 desc limit 20`,
        since
      ),
    ])

    return NextResponse.json({
      searchByDay,
      topQueries,
      topBrands,
      viewsByDay,
      topArticles,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}


