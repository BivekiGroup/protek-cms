import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({} as any))
  const title = typeof body?.title === 'string' ? body.title.slice(0, 200) : undefined
  const model = typeof body?.model === 'string' ? body.model.slice(0, 200) : undefined
  if (!title && !model) return new Response(JSON.stringify({ ok: false, error: 'nothing to update' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatSession?.update) {
      const data: any = { updatedAt: new Date() }
      if (title !== undefined) data.title = title
      if (model !== undefined) data.model = model
      await anyPrisma.chatSession.update({ where: { id }, data })
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  // Fallback
  const set: string[] = ['"updatedAt"=now()']
  if (title !== undefined) set.push(`title='${title.replace(/'/g, "''")}'`)
  if (model !== undefined) set.push(`model='${model.replace(/'/g, "''")}'`)
  await prisma.$executeRawUnsafe(`UPDATE "chat_sessions" SET ${set.join(', ')} WHERE id='${id.replace(/'/g, "''")}'`)
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatMessage?.deleteMany && anyPrisma.chatSession?.delete) {
      await anyPrisma.chatMessage.deleteMany({ where: { sessionId: id } })
      await anyPrisma.chatSession.delete({ where: { id } })
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  await prisma.$executeRawUnsafe(`DELETE FROM "chat_messages" WHERE "sessionId"='${id.replace(/'/g, "''")}'`)
  await prisma.$executeRawUnsafe(`DELETE FROM "chat_sessions" WHERE id='${id.replace(/'/g, "''")}'`)
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

