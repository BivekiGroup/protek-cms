import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
const RUNTIME_DIR = process.env.APP_WRITE_DIR || process.cwd()

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  if (!id) return new Response('id required', { status: 400 })

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (obj: any) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))
      const sendLog = (line: string) => controller.enqueue(enc.encode(`event: log\ndata: ${JSON.stringify({ line })}\n\n`))
      controller.enqueue(enc.encode('retry: 1000\n\n'))
      let lastUpdated: string | null = null
      let running = true
      // Tail logs file incrementally
      const logPath = path.join(RUNTIME_DIR, `.zzap-report-${id}.log`)
      let lastSize = 0
      try {
        if (fs.existsSync(logPath)) {
          const st = fs.statSync(logPath)
          // Отправим уже накопленные логи сразу при подключении
          const fd = fs.openSync(logPath, 'r')
          const buf = Buffer.alloc(st.size)
          fs.readSync(fd, buf, 0, buf.length, 0)
          fs.closeSync(fd)
          lastSize = st.size
          const chunk = buf.toString('utf-8')
          const lines = chunk.split(/\r?\n/).filter(Boolean)
          for (const line of lines) sendLog(line)
        }
      } catch {}
      const interval = setInterval(async () => {
        try {
          const j = await (prisma as any).zzapReportJob.findUnique({ where: { id }, select: { id: true, status: true, processed: true, total: true, resultFile: true, error: true, updatedAt: true } })
          if (!j) { send({ error: 'not found' }); return }
          const upd = j.updatedAt?.toISOString?.() || ''
          if (upd !== lastUpdated) {
            lastUpdated = upd
            send(j)
          }
          // Emit any new log lines appended since last tick
          try {
            if (fs.existsSync(logPath)) {
              const st = fs.statSync(logPath)
              if (st.size > lastSize) {
                const fd = fs.openSync(logPath, 'r')
                const buf = Buffer.alloc(st.size - lastSize)
                fs.readSync(fd, buf, 0, buf.length, lastSize)
                fs.closeSync(fd)
                lastSize = st.size
                const chunk = buf.toString('utf-8')
                const lines = chunk.split(/\r?\n/).filter(Boolean)
                for (const line of lines) sendLog(line)
              }
            }
          } catch {}
          const done = ['done','error','failed','canceled'].includes((j.status || '').toLowerCase())
          if (done) {
            clearInterval(interval)
            running = false
            try { controller.close() } catch {}
          }
        } catch {}
      }, 1000)
      req.signal.addEventListener('abort', () => { if (running) clearInterval(interval) })
    }
  })
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  })
}
