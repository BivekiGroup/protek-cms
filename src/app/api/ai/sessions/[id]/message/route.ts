import { NextRequest } from 'next/server'
import { POST as chatPOST } from '../../../chat/route'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeaders, getUserFromToken } from '@/lib/auth'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractTokenFromHeaders(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response('unauthorized', { status: 401 })
  const { content, model } = await req.json().catch(() => ({}))
  if (!content || typeof content !== 'string') {
    return new Response(JSON.stringify({ error: 'content is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  // Load existing messages for context
  let history: { role: string; content: string }[] = []
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatMessage?.findMany) {
      // Проверяем владение сессией
      if (anyPrisma.chatSession?.findUnique) {
        const session = await anyPrisma.chatSession.findUnique({ where: { id } })
        if (!session || session.userId !== user.userId) return new Response('forbidden', { status: 403 })
      }
      const msgs = await anyPrisma.chatMessage.findMany({ where: { sessionId: id }, orderBy: { createdAt: 'asc' } })
      history = msgs.map((m: any) => ({ role: m.role, content: m.content }))
    } else {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "chat_messages" (
        id text primary key,
        "sessionId" text not null,
        role text not null,
        content text not null,
        "createdAt" timestamptz not null default now()
      )`)
      const owner = await prisma.$queryRawUnsafe<any[]>(`SELECT 1 FROM "chat_sessions" WHERE id='${id.replace(/'/g, "''")}' AND "userId"='${user.userId.replace(/'/g, "''")}' LIMIT 1`)
      if (!owner?.length) return new Response('forbidden', { status: 403 })
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
      const uid = randomUUID()
      await prisma.$executeRawUnsafe(`INSERT INTO "chat_messages" (id, "sessionId", role, content) VALUES ('${uid}', '${id.replace(/'/g, "''")}', 'user', '${content.replace(/'/g, "''")}')`)
    }
  } catch {}

  // Вызов обработчика чата напрямую, без сетевого запроса и без env
  const chatUrl = new URL('/api/ai/chat', req.nextUrl)
  const backend = await chatPOST(new Request(chatUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
    body: JSON.stringify({ messages, model })
  }))

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
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          assistantText += chunk
          controller.enqueue(encoder.encode(chunk))
        }
      } finally {
        controller.close()
        // Persist assistant message after stream finishes
        try {
          const anyPrisma: any = prisma as any
          if (assistantText) {
            if (anyPrisma.chatMessage?.create && anyPrisma.chatSession?.update) {
              await anyPrisma.chatMessage.create({ data: { sessionId: id, role: 'assistant', content: assistantText } })
              await anyPrisma.chatSession.update({ where: { id }, data: { updatedAt: new Date(), ...(model ? { model } : {}) } })
            } else {
              const uid2 = randomUUID()
              await prisma.$executeRawUnsafe(`INSERT INTO "chat_messages" (id, "sessionId", role, content) VALUES ('${uid2}', '${id.replace(/'/g, "''")}', 'assistant', '${assistantText.replace(/'/g, "''")}')`)
              await prisma.$executeRawUnsafe(`UPDATE "chat_sessions" SET "updatedAt"=now()${model ? `, model='${model.replace(/'/g, "''")}'` : ''} WHERE id='${id.replace(/'/g, "''")}'`)
            }
          }
        } catch {}
      }
    },
    async cancel() { try { await reader.cancel() } catch {} }
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } })
}
