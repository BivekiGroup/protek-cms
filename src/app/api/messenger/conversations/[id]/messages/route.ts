import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractAnyToken, getUserFromToken } from '@/lib/auth'
import { messengerBus } from '@/lib/messenger-events'
import { uploadFile, generateFileKey } from '@/lib/s3'

export const dynamic = 'force-dynamic'

async function ensureMember(conversationId: string, userId: string) {
  const member = await prisma.messengerParticipant.findFirst({ where: { conversationId, userId } })
  if (!member) throw new Error('forbidden')
  return member
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const items = await prisma.messengerMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    take: 500,
    include: { attachments: true, reads: true, reactions: true },
  })
  return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractAnyToken(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })
  try { await ensureMember(id, user.userId) } catch { return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403 }) }

  const ct = (req.headers.get('content-type') || '').toLowerCase()
  let content = ''
  const files: File[] = []
  if (ct.includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null)
    if (form) {
      content = String(form.get('content') || '')
      for (const [key, value] of form.entries()) {
        if (key === 'file' && value instanceof File) files.push(value)
      }
    }
  } else {
    const json = await req.json().catch(() => ({} as any))
    content = typeof json?.content === 'string' ? json.content : ''
  }
  if (!content && files.length === 0) content = '(без текста)'

  const created = await prisma.messengerMessage.create({ data: { conversationId: id, senderId: user.userId, content } })

  if (files.length > 0) {
    const uploaded = [] as { url: string; fileName: string; contentType?: string; size: number }[]
    for (const f of files) {
      const key = generateFileKey(f.name, `messenger/${id}`)
      const res = await uploadFile({ file: f, key, contentType: f.type })
      uploaded.push({ url: res.url, fileName: f.name, contentType: f.type, size: f.size })
    }
    await prisma.messengerAttachment.createMany({ data: uploaded.map(u => ({ messageId: created.id, url: u.url, fileName: u.fileName, contentType: u.contentType || null, size: u.size })) })
  }

  await prisma.messengerConversation.update({ where: { id }, data: { updatedAt: new Date() } }).catch(() => {})
  messengerBus.emitToUsers((await prisma.messengerParticipant.findMany({ where: { conversationId: id }, select: { userId: true } })).map(m => m.userId), { type: 'message.created', conversationId: id, messageId: created.id, actorUserId: user.userId, data: created })

  return new Response(JSON.stringify({ ok: true, id: created.id }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}



