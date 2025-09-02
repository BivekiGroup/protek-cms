import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const take = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))
    const items = await (prisma as any).zzapReportJob.findMany({ orderBy: { createdAt: 'desc' }, take, select: { id: true, status: true, processed: true, total: true, resultFile: true, error: true, createdAt: true, updatedAt: true } })
    return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
}

