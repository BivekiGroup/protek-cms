import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeaders, getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractTokenFromHeaders(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const body = await req.json().catch(() => ({} as any))
  const title = typeof body?.title === 'string' ? body.title.slice(0, 200) : undefined
  const model = typeof body?.model === 'string' ? body.model.slice(0, 200) : undefined
  if (!title && !model) return new Response(JSON.stringify({ ok: false, error: 'nothing to update' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatSession?.update) {
      const current = await anyPrisma.chatSession.findUnique({ where: { id } })
      if (!current || current.userId !== user.userId) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json; charset=utf-8' } })
      const data: any = { updatedAt: new Date() }
      if (title !== undefined) data.title = title
      if (model !== undefined) data.model = model
      await anyPrisma.chatSession.update({ where: { id }, data })
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  // Fallback
  const owner = await prisma.$queryRawUnsafe<any[]>(`SELECT 1 FROM "chat_sessions" WHERE id='${id.replace(/'/g, "''")}' AND "userId"='${user.userId.replace(/'/g, "''")}' LIMIT 1`)
  if (!owner?.length) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const set: string[] = ['"updatedAt"=now()']
  if (title !== undefined) set.push(`title='${title.replace(/'/g, "''")}'`)
  if (model !== undefined) set.push(`model='${model.replace(/'/g, "''")}'`)
  await prisma.$executeRawUnsafe(`UPDATE "chat_sessions" SET ${set.join(', ')} WHERE id='${id.replace(/'/g, "''")}'`)
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractTokenFromHeaders(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json; charset=utf-8' } })
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.chatMessage?.deleteMany && anyPrisma.chatSession?.delete) {
      const current = await anyPrisma.chatSession.findUnique({ where: { id } })
      if (!current || current.userId !== user.userId) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json; charset=utf-8' } })
      await anyPrisma.chatMessage.deleteMany({ where: { sessionId: id } })
      await anyPrisma.chatSession.delete({ where: { id } })
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  const owner = await prisma.$queryRawUnsafe<any[]>(`SELECT 1 FROM "chat_sessions" WHERE id='${id.replace(/'/g, "''")}' AND "userId"='${user.userId.replace(/'/g, "''")}' LIMIT 1`)
  if (!owner?.length) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json; charset=utf-8' } })
  await prisma.$executeRawUnsafe(`DELETE FROM "chat_messages" WHERE "sessionId"='${id.replace(/'/g, "''")}'`)
  await prisma.$executeRawUnsafe(`DELETE FROM "chat_sessions" WHERE id='${id.replace(/'/g, "''")}'`)
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

