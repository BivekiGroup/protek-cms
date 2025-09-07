import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeaders, getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractTokenFromHeaders(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json; charset=utf-8' } })
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatMessage?.findMany) {
      // Проверяем владение сессией
      if (anyPrisma.chatSession?.findUnique) {
        const session = await anyPrisma.chatSession.findUnique({ where: { id } })
        if (!session || session.userId !== user.userId) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json; charset=utf-8' } })
      }
      const items = await anyPrisma.chatMessage.findMany({ where: { sessionId: id }, orderBy: { createdAt: 'asc' } })
      return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "chat_messages" (
    id text primary key,
    "sessionId" text not null,
    role text not null,
    content text not null,
    "createdAt" timestamptz not null default now()
  )`)
  // Fallback: проверяем владение через raw SQL
  const owner = await prisma.$queryRawUnsafe<any[]>(`SELECT 1 FROM "chat_sessions" WHERE id='${id.replace(/'/g, "''")}' AND "userId"='${user.userId.replace(/'/g, "''")}' LIMIT 1`)
  if (!owner?.length) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id, role, content, "createdAt" FROM "chat_messages" WHERE "sessionId"='${id.replace(/'/g, "''")}' ORDER BY "createdAt" ASC`)
  return new Response(JSON.stringify({ ok: true, items: rows }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractTokenFromHeaders(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const body = await req.json().catch(() => ({} as any))
  const role = (body?.role === 'assistant' || body?.role === 'user') ? body.role : 'assistant'
  const content = typeof body?.content === 'string' ? body.content : ''
  if (!content) return new Response(JSON.stringify({ ok: false, error: 'content_required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatSession?.findUnique && anyPrisma.chatMessage?.create) {
      const session = await anyPrisma.chatSession.findUnique({ where: { id } })
      if (!session || session.userId !== user.userId) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json; charset=utf-8' } })
      await anyPrisma.chatMessage.create({ data: { sessionId: id, role, content } })
      await anyPrisma.chatSession.update({ where: { id }, data: { updatedAt: new Date() } })
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  // Fallback raw SQL
  const owner = await prisma.$queryRawUnsafe<any[]>(`SELECT 1 FROM "chat_sessions" WHERE id='${id.replace(/'/g, "''")}' AND "userId"='${user.userId.replace(/'/g, "''")}' LIMIT 1`)
  if (!owner?.length) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json; charset=utf-8' } })
  await prisma.$executeRawUnsafe(`INSERT INTO "chat_messages" (id, "sessionId", role, content) VALUES (gen_random_uuid()::text, '${id.replace(/'/g, "''")}', '${role.replace(/'/g, "''")}', '${content.replace(/'/g, "''")}')`)
  await prisma.$executeRawUnsafe(`UPDATE "chat_sessions" SET "updatedAt"=now() WHERE id='${id.replace(/'/g, "''")}'`)
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}
