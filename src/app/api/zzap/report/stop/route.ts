import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  if (!id) return new Response(JSON.stringify({ ok: false, error: 'id required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const job = await (prisma as any).zzapReportJob.update({ where: { id }, data: { status: 'canceled', error: 'stopped by user', resultFile: null } })
  return new Response(JSON.stringify({ ok: true, status: job.status }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}
