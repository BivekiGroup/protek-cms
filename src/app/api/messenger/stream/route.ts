import { NextRequest } from 'next/server'
import { extractAnyToken, getUserFromToken } from '@/lib/auth'
import { messengerBus } from '@/lib/messenger-events'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = extractAnyToken(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response('unauthorized', { status: 401 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const send = (data: any) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }
      const unsub = messengerBus.subscribe(user.userId, (evt) => { send(evt) })
      const interval = setInterval(() => send({ type: 'keepalive' }), 30000)
      const abort = () => {
        if (closed) return
        closed = true
        clearInterval(interval)
        unsub()
        try { controller.close() } catch {}
      }
      req.signal?.addEventListener('abort', abort)
    },
    cancel() {},
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  })
}


