 
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeaders, getUserFromToken } from '@/lib/auth'
import { messengerBus } from '@/lib/messenger-events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractTokenFromHeaders(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })
  const body = await req.json().catch(() => ({} as any))
  const messageId = typeof body?.messageId === 'string' ? body.messageId : null
  if (!messageId) return new Response(JSON.stringify({ ok: false, error: 'messageId_required' }), { status: 400 })

  const member = await prisma.messengerParticipant.findFirst({ where: { conversationId: id, userId: user.userId } })
  if (!member) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403 })

  await prisma.$transaction([
    prisma.messengerReadReceipt.upsert({
      where: { messageId_userId: { messageId, userId: user.userId } },
      update: { readAt: new Date() },
      create: { messageId, userId: user.userId },
    }),
    prisma.messengerParticipant.update({ where: { id: member.id }, data: { lastReadAt: new Date() } }),
  ])

  const memberIds = (await prisma.messengerParticipant.findMany({ where: { conversationId: id }, select: { userId: true } })).map(m => m.userId)
  messengerBus.emitToUsers(memberIds, { type: 'read.updated', conversationId: id, actorUserId: user.userId, data: { messageId } })

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}


