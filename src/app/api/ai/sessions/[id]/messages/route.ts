import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatMessage?.findMany) {
      const items = await anyPrisma.chatMessage.findMany({ where: { sessionId: id }, orderBy: { createdAt: 'asc' } })
      return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id, role, content, "createdAt" FROM "chat_messages" WHERE "sessionId"='${id.replace(/'/g, "''")}' ORDER BY "createdAt" ASC`)
  return new Response(JSON.stringify({ ok: true, items: rows }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

