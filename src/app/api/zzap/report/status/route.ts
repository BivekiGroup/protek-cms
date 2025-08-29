import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  if (!id) return new Response(JSON.stringify({ ok: false, error: 'id required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const job = await prisma.zzapReportJob.findUnique({ where: { id } })
  if (!job) return new Response(JSON.stringify({ ok: false, error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } })
  return new Response(JSON.stringify({ ok: true, status: job.status, processed: job.processed, total: job.total, resultFile: job.resultFile, error: job.error }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

