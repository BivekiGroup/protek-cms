import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type JobRow = {
  id: string
  status: string
  processed: number
  total: number
  resultFile?: string | null
  error?: string | null
  updatedAt?: Date | string
}

async function loadJob(id: string): Promise<JobRow | null> {
  const j = await (prisma as any).zzapReportJob.findUnique({ where: { id }, select: { id: true, status: true, processed: true, total: true, resultFile: true, error: true, updatedAt: true } })
  return j || null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  if (!id) return new Response('id required', { status: 400 })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder()
      let closed = false
      let timer: any = null

      const closeStream = () => {
        if (closed) return
        closed = true
        try { clearInterval(keepAlive) } catch {}
        try { if (timer) clearTimeout(timer) } catch {}
        try { controller.close() } catch {}
      }

      const send = (data: any) => { if (!closed) { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {} } }
      const sendEvent = (event: string, data: any) => { if (!closed) { try { controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) } catch {} } }

      async function tick() {
        if (closed) return
        try {
          const job = await loadJob(id)
          if (!job) { sendEvent('error', { error: 'not_found' }); return closeStream() }
          const payload = { status: job.status, processed: job.processed || 0, total: job.total || 0, resultFile: job.resultFile || null, error: job.error || null }
          send(payload)
          if (['done', 'canceled', 'failed', 'error'].includes((job.status || '').toLowerCase())) return closeStream()
        } catch (e) {
          // swallow transient errors; next tick may succeed
        }
        if (!closed) timer = setTimeout(tick, 1000)
      }
      // Keep-alive comment every 20s in case no changes
      const keepAlive = setInterval(() => { if (!closed) { try { controller.enqueue(enc.encode(`:\n\n`)) } catch {} } }, 20000)
      // Kick off
      tick()
      // Try to bind to request abort
      try { (req as any).signal?.addEventListener?.('abort', closeStream) } catch {}
    },
    cancel() {
      // Reader cancelled from client
      // Nothing to do here: start() registered abort handler and self-closes
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
