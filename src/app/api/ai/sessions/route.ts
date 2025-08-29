import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeaders, getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = extractTokenFromHeaders(req.headers)
  const user = getUserFromToken(token)
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatSession?.findMany) {
      const items = await anyPrisma.chatSession.findMany({
        where: { userId: user?.userId || undefined },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: { id: true, title: true, model: true, createdAt: true, updatedAt: true },
      })
      return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  // Fallback raw
  const where = user?.userId ? `WHERE "userId"='${user.userId.replace(/'/g, "''")}'` : ''
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id, title, model, "createdAt", "updatedAt" FROM "chat_sessions" ${where} ORDER BY "updatedAt" DESC LIMIT 100`)
  return new Response(JSON.stringify({ ok: true, items: rows }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

export async function POST(req: NextRequest) {
  const token = extractTokenFromHeaders(req.headers)
  const user = getUserFromToken(token)
  const body = await req.json().catch(() => ({}))
  const title = (body?.title || 'Новый диалог').toString().slice(0, 200)
  const model = (body?.model || 'openai/gpt-4o').toString().slice(0, 200)
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatSession?.create) {
      const created = await anyPrisma.chatSession.create({ data: { title, model, userId: user?.userId || null } })
      return new Response(JSON.stringify({ ok: true, id: created.id }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "chat_sessions" (id text primary key, "userId" text, title text not null default 'Новый диалог', model text not null default 'openai/gpt-4o', "createdAt" timestamptz not null default now(), "updatedAt" timestamptz not null default now())`)
  const { randomUUID } = await import('crypto')
  const id = randomUUID()
  await prisma.$executeRawUnsafe(`INSERT INTO "chat_sessions" (id, "userId", title, model) VALUES ('${id}', ${user?.userId ? `'${user.userId.replace(/'/g, "''")}'` : 'NULL'}, '${title.replace(/'/g, "''")}', '${model.replace(/'/g, "''")}')`)
  return new Response(JSON.stringify({ ok: true, id }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

