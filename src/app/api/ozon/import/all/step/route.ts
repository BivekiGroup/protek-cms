import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchOzonPage } from '@/lib/ozon'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as any
    const id = body.id as string
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const job = await prisma.ozonImportJob.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

    if (job.status === 'done' || job.status === 'error') {
      return NextResponse.json({ job })
    }

    // set running if first step
    if (job.status === 'pending') {
      await prisma.ozonImportJob.update({ where: { id }, data: { status: 'running', startedAt: new Date() } })
    }

    // process 1 page per step to avoid timeouts
    const resp = await fetchOzonPage({ q: job.q || undefined, last_id: job.lastId || undefined, limit: job.batchSize })
    const items = resp.items || []

    if (items.length === 0) {
      const done = await prisma.ozonImportJob.update({ where: { id }, data: { status: 'done', finishedAt: new Date() } })
      return NextResponse.json({ job: done })
    }

    const payload = {
      items: items.map((i: any) => ({
        id: String(i.id),
        name: i.name,
        brand: i.brand,
        oem: i.oem,
        price: i.price,
        images: Array.isArray(i.images) ? i.images : [],
        attributes: i.attributes || {},
        mode: job.mode as any,
      }))
    }

    const url = new URL('/api/ozon/import', req.url).toString()
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json().catch(() => ({} as any))

    let created = job.createdCnt
    let updated = job.updatedCnt
    let failed = job.failedCnt
    if (res.ok) {
      const results = Array.isArray(json?.results) ? json.results : []
      created += results.filter((r: any) => r.status === 'created').length
      updated += results.filter((r: any) => r.status === 'updated').length
      failed += results.filter((r: any) => r.status === 'error').length
    } else {
      failed += payload.items.length
    }

    const next = await prisma.ozonImportJob.update({
      where: { id },
      data: {
        page: job.page + 1,
        lastId: resp.last_id || null,
        processed: job.processed + items.length,
        createdCnt: created,
        updatedCnt: updated,
        failedCnt: failed,
        status: resp.last_id ? 'running' : 'done',
        finishedAt: resp.last_id ? null : new Date(),
      }
    })

    return NextResponse.json({ job: next })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'step failed' }, { status: 500 })
  }
}

