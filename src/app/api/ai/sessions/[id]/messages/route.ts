import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatMessage?.findMany) {
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
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id, role, content, "createdAt" FROM "chat_messages" WHERE "sessionId"='${id.replace(/'/g, "''")}' ORDER BY "createdAt" ASC`)
  return new Response(JSON.stringify({ ok: true, items: rows }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}
