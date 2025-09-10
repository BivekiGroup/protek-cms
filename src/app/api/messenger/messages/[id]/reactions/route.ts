import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractAnyToken, getUserFromToken } from '@/lib/auth'
import { messengerBus } from '@/lib/messenger-events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractAnyToken(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })
  const body = await req.json().catch(() => ({} as any))
  const emoji = typeof body?.emoji === 'string' ? body.emoji.slice(0, 24) : null
  if (!emoji) return new Response(JSON.stringify({ ok: false, error: 'emoji_required' }), { status: 400 })
  const msg = await prisma.messengerMessage.findUnique({ where: { id }, select: { id: true, conversationId: true } })
  if (!msg) return new Response(JSON.stringify({ ok: false, error: 'not_found' }), { status: 404 })

  const existing = await prisma.messengerReaction.findFirst({ where: { messageId: id, userId: user.userId, emoji } })
  if (!existing) {
    await prisma.messengerReaction.create({ data: { messageId: id, userId: user.userId, emoji } })
  }
  const memberIds = (await prisma.messengerParticipant.findMany({ where: { conversationId: msg.conversationId }, select: { userId: true } })).map(m => m.userId)
  messengerBus.emitToUsers(memberIds, { type: 'ping', conversationId: msg.conversationId, actorUserId: user.userId, data: { reaction: { messageId: id, emoji, userId: user.userId } } })
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractAnyToken(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })
  const emoji = new URL(req.url).searchParams.get('emoji')?.slice(0, 24)
  if (!emoji) return new Response(JSON.stringify({ ok: false, error: 'emoji_required' }), { status: 400 })
  await prisma.messengerReaction.deleteMany({ where: { messageId: id, userId: user.userId, emoji } }).catch(() => null)
  const msg = await prisma.messengerMessage.findUnique({ where: { id }, select: { conversationId: true } })
  if (msg) {
    const memberIds = (await prisma.messengerParticipant.findMany({ where: { conversationId: msg.conversationId }, select: { userId: true } })).map(m => m.userId)
    messengerBus.emitToUsers(memberIds, { type: 'ping', conversationId: msg.conversationId, actorUserId: user.userId, data: { reactionRemoved: { messageId: id, emoji, userId: user.userId } } })
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

