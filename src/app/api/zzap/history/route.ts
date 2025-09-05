import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20))
    const q = (searchParams.get('q') || '').trim()
    const skip = (page - 1) * pageSize

    const where = q ? { article: { contains: q, mode: 'insensitive' as const } } : undefined
    const [items, total, recentJobs] = await Promise.all([
      (prisma as any).zzapRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          provider: true,
          article: true,
          statsUrl: true,
          imageUrl: true,
          ok: true,
          selector: true,
          logs: true,
          createdAt: true,
        }
      }),
      (prisma as any).zzapRequest.count({ where }),
      (prisma as any).zzapReportJob.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { results: true } })
    ])
    // Enrich with prices/stats from recent batch jobs by article key
    const norm = (s: string) => (s || '').toString().trim().toUpperCase().replace(/\s+/g, '')
    const byArticle = new Map<string, { prices?: number[]; stats?: Record<string, number> }>()
    for (const j of recentJobs || []) {
      const arr = (j?.results as any[]) || []
      for (const r of arr) {
        const a = norm((r as any)?.article || '')
        if (!a) continue
        if (!byArticle.has(a)) byArticle.set(a, { prices: (r as any)?.prices || undefined, stats: (r as any)?.stats || undefined })
      }
    }
    const enriched = items.map((it: any) => {
      const a = norm(it.article)
      const extra = byArticle.get(a) || {}
      return { ...it, prices: extra.prices, stats: extra.stats }
    })

    return new Response(JSON.stringify({ items: enriched, total, page, pageSize }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err || 'Unknown error') }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    })
  }
}

