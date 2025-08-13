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

    let items: any[] = []
    let total = 0
    if ((prisma as any).zzapRequest?.findMany) {
      const where = q ? { article: { contains: q, mode: 'insensitive' as const } } : undefined
      const [i, t] = await Promise.all([
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
        (prisma as any).zzapRequest.count({ where })
      ])
      items = i
      total = t
    } else {
      // Fallback via raw SQL if client not regenerated yet (Postgres quoted camelCase)
      let where = 'WHERE 1=1'
      if (q) {
        const esc = q.replace(/['\\]/g, (m) => ({"'":"''","\\":"\\\\"}[m] as string)).replace(/[%_]/g, (m) => '\\' + m)
        where += ` AND "article" ILIKE '%${esc}%' ESCAPE '\\'`
      }
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, provider, article, "statsUrl" as "statsUrl", "imageUrl" as "imageUrl", ok, selector, logs, "createdAt" as "createdAt"
         FROM "zzap_requests"
         ${where}
         ORDER BY "createdAt" DESC
         LIMIT ${pageSize} OFFSET ${skip}`
      )
      const cnt = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int as count FROM "zzap_requests" ${where}`
      )
      items = rows
      total = cnt?.[0]?.count || 0
    }

    return new Response(JSON.stringify({ items, total, page, pageSize }), {
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
