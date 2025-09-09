 
import { NextRequest } from 'next/server'
import { extractTokenFromHeaders, getUserFromToken } from '@/lib/auth'
import { messengerBus } from '@/lib/messenger-events'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractTokenFromHeaders(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })
  const exists = await prisma.messengerParticipant.findFirst({ where: { conversationId: id, userId: user.userId } })
  if (!exists) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403 })

  const memberIds = (await prisma.messengerParticipant.findMany({ where: { conversationId: id }, select: { userId: true } })).map(m => m.userId)
  messengerBus.emitToUsers(memberIds, { type: 'ping', conversationId: id, actorUserId: user.userId, data: { typing: true } })
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}


