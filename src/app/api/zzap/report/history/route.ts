import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)))
  const items = await (prisma as any).zzapReportJob.findMany({ orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, status: true, processed: true, total: true, resultFile: true, error: true, createdAt: true, updatedAt: true } })
  return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}
