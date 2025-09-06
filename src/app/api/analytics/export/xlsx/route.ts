import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const days = Number(url.searchParams.get('days') || '7')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [
      searchByDay, topQueries, topBrands, viewsByDay, topArticles,
      // Полные события за период
      fullSearches, fullViews,
      // KPI
      kSearch1, kSearch7, kSearch30, kViews1, kViews7, kViews30,
    ] = await Promise.all([
      prisma.$queryRaw<any[]>`select date_trunc('day', "createdAt") as d, count(*)::int as c from "analytics_search_events" where "createdAt" >= ${since} group by 1 order by 1`,
      prisma.$queryRaw<any[]>`select lower(query) as q, count(*)::int as c from "analytics_search_events" where "createdAt" >= ${since} group by 1 order by 2 desc limit 500`,
      prisma.$queryRaw<any[]>`select upper(coalesce(brand,'-')) as b, count(*)::int as c from "analytics_search_events" where "createdAt" >= ${since} group by 1 order by 2 desc limit 500`,
      prisma.$queryRaw<any[]>`select date_trunc('day', "createdAt") as d, count(*)::int as c from "analytics_product_views" where "createdAt" >= ${since} group by 1 order by 1`,
      prisma.$queryRaw<any[]>`select upper(coalesce(brand,'-')) as b, coalesce(article,'-') as a, count(*)::int as c from "analytics_product_views" where "createdAt" >= ${since} group by 1,2 order by 3 desc limit 500`,
      prisma.searchEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, clientId: true, sessionId: true, query: true, brand: true, article: true, resultsCount: true, filters: true }
      }),
      prisma.productViewEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, clientId: true, sessionId: true, brand: true, article: true, productId: true, offerKey: true, referrer: true }
      }),
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_search_events" where "createdAt" >= ${new Date(Date.now() - 1*24*60*60*1000)}`,
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_search_events" where "createdAt" >= ${new Date(Date.now() - 7*24*60*60*1000)}`,
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_search_events" where "createdAt" >= ${new Date(Date.now() - 30*24*60*60*1000)}`,
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_product_views" where "createdAt" >= ${new Date(Date.now() - 1*24*60*60*1000)}`,
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_product_views" where "createdAt" >= ${new Date(Date.now() - 7*24*60*60*1000)}`,
      prisma.$queryRaw<any[]>`select count(*)::int as c from "analytics_product_views" where "createdAt" >= ${new Date(Date.now() - 30*24*60*60*1000)}`,
    ])

    const n = (r: any[]) => Number(r?.[0]?.c || 0)

    const wb = XLSX.utils.book_new()

    // Overview (KPI + период)
    const generatedAt = new Date().toISOString()
    const overviewAoA = [
      ['Analytics Export'],
      ['Generated At', generatedAt],
      ['Period (days)', days],
      ['Since', since.toISOString()],
      [],
      ['Metric', '1d', '7d', '30d'],
      ['Searches', n(kSearch1), n(kSearch7), n(kSearch30)],
      ['Product Views', n(kViews1), n(kViews7), n(kViews30)],
    ]
    const shOverview = XLSX.utils.aoa_to_sheet(overviewAoA)
    shOverview['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, shOverview, 'Overview')

    // Daily
    const dailyAoA = [['Date', 'Searches', 'Views']]
    const byDate: Record<string, { s: number; v: number }> = {}
    for (const r of searchByDay) { const d = new Date(r.d).toISOString().slice(0,10); byDate[d] = { ...(byDate[d]||{s:0,v:0}), s: Number(r.c)||0 } }
    for (const r of viewsByDay) { const d = new Date(r.d).toISOString().slice(0,10); byDate[d] = { ...(byDate[d]||{s:0,v:0}), v: Number(r.c)||0 } }
    Object.keys(byDate).sort().forEach((d) => dailyAoA.push([d, byDate[d].s, byDate[d].v]))
    const shDaily = XLSX.utils.aoa_to_sheet(dailyAoA)
    shDaily['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }]
    shDaily['!autofilter'] = { ref: shDaily['!ref'] as string }
    XLSX.utils.book_append_sheet(wb, shDaily, 'Daily')

    // Top queries
    const tqAoA = [['Query', 'Count']]
    topQueries.forEach((t: any) => tqAoA.push([t.q, Number(t.c)||0]))
    const shTopQ = XLSX.utils.aoa_to_sheet(tqAoA)
    shTopQ['!cols'] = [{ wch: 40 }, { wch: 10 }]
    shTopQ['!autofilter'] = { ref: shTopQ['!ref'] as string }
    XLSX.utils.book_append_sheet(wb, shTopQ, 'TopQueries')

    // Top brands (search)
    const tbAoA = [['Brand', 'Count']]
    topBrands.forEach((t: any) => tbAoA.push([t.b, Number(t.c)||0]))
    const shTopB = XLSX.utils.aoa_to_sheet(tbAoA)
    shTopB['!cols'] = [{ wch: 18 }, { wch: 10 }]
    shTopB['!autofilter'] = { ref: shTopB['!ref'] as string }
    XLSX.utils.book_append_sheet(wb, shTopB, 'TopBrands')

    // Top viewed articles
    const taAoA = [['Brand', 'Article', 'Views']]
    topArticles.forEach((t: any) => taAoA.push([t.b, t.a, Number(t.c)||0]))
    const shTopA = XLSX.utils.aoa_to_sheet(taAoA)
    shTopA['!cols'] = [{ wch: 20 }, { wch: 24 }, { wch: 10 }]
    shTopA['!autofilter'] = { ref: shTopA['!ref'] as string }
    XLSX.utils.book_append_sheet(wb, shTopA, 'TopArticles')

    // Full search events for period
    const seAoA = [['DateTime', 'Query', 'Brand', 'Article', 'Results', 'Mode', 'Page', 'ClientId', 'SessionId']]
    fullSearches.forEach((s: any) => {
      const mode = (s.filters && (s.filters as any).mode) || ''
      const page = (s.filters && (s.filters as any).page) || ''
      seAoA.push([
        new Date(s.createdAt).toISOString(), s.query, s.brand||'', s.article||'', Number(s.resultsCount)||0,
        String(mode||''), String(page||''), s.clientId||'', s.sessionId||''
      ])
    })
    const shSearches = XLSX.utils.aoa_to_sheet(seAoA)
    shSearches['!cols'] = [
      { wch: 22 }, { wch: 36 }, { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 28 }, { wch: 26 }, { wch: 26 }
    ]
    shSearches['!autofilter'] = { ref: shSearches['!ref'] as string }
    XLSX.utils.book_append_sheet(wb, shSearches, 'Searches')

    // Full product view events for period
    const veAoA = [['DateTime', 'Brand', 'Article', 'ProductId', 'OfferKey', 'Referrer', 'ClientId', 'SessionId']]
    fullViews.forEach((v: any) => veAoA.push([
      new Date(v.createdAt).toISOString(), v.brand||'', v.article||'', v.productId||'', v.offerKey||'', v.referrer||'', v.clientId||'', v.sessionId||''
    ]))
    const shViews = XLSX.utils.aoa_to_sheet(veAoA)
    shViews['!cols'] = [
      { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 40 }, { wch: 40 }, { wch: 26 }, { wch: 26 }
    ]
    shViews['!autofilter'] = { ref: shViews['!ref'] as string }
    XLSX.utils.book_append_sheet(wb, shViews, 'Views')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const fname = `analytics-${new Date().toISOString().slice(0,10)}.xlsx`
    return new Response(buf, {
      status: 200,
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="${fname}"`,
        'cache-control': 'no-store',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
}
