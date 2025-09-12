import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as any
    const q = typeof body.q === 'string' && body.q.trim() ? body.q.trim() : null
    const mode = ['new','auto','update'].includes(body.mode) ? body.mode : 'auto'
    const batchSize = Number.isInteger(body.batchSize) && body.batchSize > 0 ? Math.min(200, body.batchSize) : 50
    const maxPages = Number.isInteger(body.maxPages) && body.maxPages > 0 ? Math.min(2000, body.maxPages) : 500

    const job = await prisma.ozonImportJob.create({ data: { status: 'pending', q: q || undefined, mode, batchSize, maxPages } })
    return NextResponse.json({ id: job.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to start job' }, { status: 500 })
  }
}

