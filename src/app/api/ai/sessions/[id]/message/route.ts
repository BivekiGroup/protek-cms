import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params
  const { content, model } = await req.json().catch(() => ({}))
  if (!content || typeof content !== 'string') {
    return new Response(JSON.stringify({ error: 'content is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  // Load existing messages for context
  let history: { role: string; content: string }[] = []
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatMessage?.findMany) {
      const msgs = await anyPrisma.chatMessage.findMany({ where: { sessionId: id }, orderBy: { createdAt: 'asc' } })
      history = msgs.map((m: any) => ({ role: m.role, content: m.content }))
    } else {
      const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT role, content FROM "chat_messages" WHERE "sessionId"='${id.replace(/'/g, "''")}' ORDER BY "createdAt" ASC`)
      history = rows.map((m) => ({ role: m.role, content: m.content }))
    }
  } catch {}

  const userMsg = { role: 'user', content }
  const messages = [...history, userMsg]

  // Persist user message immediately
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatMessage?.create) {
      await anyPrisma.chatMessage.create({ data: { sessionId: id, role: 'user', content } })
    } else {
      await prisma.$executeRawUnsafe(`INSERT INTO "chat_messages" (id, "sessionId", role, content) VALUES (gen_random_uuid()::text, '${id.replace(/'/g, "''")}', 'user', '${content.replace(/'/g, "''")}')`)
    }
  } catch {}

  // Call existing chat endpoint with streaming
  const backend = await fetch(new URL('/api/ai/chat', req.url).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
    body: JSON.stringify({ messages, model }),
  })

  if (!backend.ok || !backend.body) {
    const text = await backend.text().catch(() => '')
    return new Response(text || 'AI error', { status: backend.status || 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const reader = backend.body.getReader()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let assistantText = ''

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        assistantText += chunk
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
    async cancel() { try { await reader.cancel() } catch {} }
  })

  // After stream finishes, persist assistant message and update session updatedAt
  stream.getReader().read().catch(() => {})
  ;(async () => {
    try {
      // Wait a tick to ensure assistantText has full content
      await new Promise(r => setTimeout(r, 10))
      const anyPrisma: any = prisma as any
      if (anyPrisma.chatMessage?.create && anyPrisma.chatSession?.update) {
        await anyPrisma.chatMessage.create({ data: { sessionId: id, role: 'assistant', content: assistantText } })
        await anyPrisma.chatSession.update({ where: { id }, data: { updatedAt: new Date() } })
      } else {
        await prisma.$executeRawUnsafe(`INSERT INTO "chat_messages" (id, "sessionId", role, content) VALUES (gen_random_uuid()::text, '${id.replace(/'/g, "''")}', 'assistant', '${assistantText.replace(/'/g, "''")}')`)
        await prisma.$executeRawUnsafe(`UPDATE "chat_sessions" SET "updatedAt"=now() WHERE id='${id.replace(/'/g, "''")}'`)
      }
    } catch {}
  })()

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } })
}

