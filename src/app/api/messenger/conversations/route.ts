import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractAnyToken, getUserFromToken } from '@/lib/auth'
import { messengerBus } from '@/lib/messenger-events'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = extractAnyToken(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })

  const items = await prisma.messengerParticipant.findMany({
    where: { userId: user.userId },
    include: {
      conversation: {
        include: {
          members: { include: { user: true } },
        },
      },
    },
    orderBy: { conversation: { updatedAt: 'desc' } },
    take: 200,
  })

  const conversations = await Promise.all(items.map(async (i) => {
    const lastReadAt = i.lastReadAt || null
    const unreadCount = await prisma.messengerMessage.count({
      where: { conversationId: i.conversationId, createdAt: lastReadAt ? { gt: lastReadAt } : undefined, senderId: { not: user.userId } },
    })
    return {
      id: i.conversationId,
      type: i.conversation.type,
      title: i.conversation.title,
      avatar: (i.conversation as any).avatar ?? null,
      updatedAt: i.conversation.updatedAt,
      lastReadAt,
      memberIds: i.conversation.members.map(m => m.userId),
      members: i.conversation.members.map(m => ({ user: m.user })),
      unreadCount,
    }
  }))

  // Дедуп для DIRECT по паре участников (на случай дублей)
  const uniqueConversations = new Map<string, typeof conversations[0]>()
  for (const conv of conversations) {
    if (conv.type === 'DIRECT' && conv.memberIds.length === 2) {
      const sortedMemberIds = [...conv.memberIds].sort().join('-')
      const existing = uniqueConversations.get(sortedMemberIds)
      if (!existing || new Date(conv.updatedAt) > new Date(existing.updatedAt)) uniqueConversations.set(sortedMemberIds, conv)
    } else {
      uniqueConversations.set(conv.id, conv)
    }
  }

  return new Response(JSON.stringify({ ok: true, items: Array.from(uniqueConversations.values()) }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

export async function POST(req: NextRequest) {
  const token = extractAnyToken(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })
  const body = await req.json().catch(() => ({} as any))
  const type = body?.type === 'GROUP' ? 'GROUP' : 'DIRECT'
  const rawMemberIds: string[] = Array.isArray(body?.memberIds) ? body.memberIds : []
  const memberIds = Array.from(new Set(rawMemberIds.filter(Boolean)))
  if (!memberIds.includes(user.userId)) memberIds.push(user.userId)

  if (type === 'DIRECT') {
    const pair = Array.from(new Set(memberIds))
    if (pair.length === 1) pair.push(user.userId)
    if (pair.length === 2) {
      const existing = await prisma.messengerConversation.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            { members: { some: { userId: pair[0] } } },
            { members: { some: { userId: pair[1] } } },
            { members: { every: { userId: { in: pair } } } },
          ],
        },
        select: { id: true },
      })
      if (existing) {
        return new Response(JSON.stringify({ ok: true, id: existing.id, reused: true }), { status: 200 })
      }
    }
  }

  const created = await prisma.messengerConversation.create({
    data: {
      type: type as any,
      title: type === 'GROUP' ? (typeof body?.title === 'string' ? body.title : null) : null,
      members: {
        createMany: { data: memberIds.map(uid => ({ userId: uid })) },
      },
    },
    select: { id: true },
  })

  messengerBus.emitToUsers(memberIds, { type: 'conversation.updated', conversationId: created.id })
  return new Response(JSON.stringify({ ok: true, id: created.id }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}
