import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractAnyToken, getUserFromToken } from '@/lib/auth'
import { uploadFile, generateFileKey } from '@/lib/s3'
import { messengerBus } from '@/lib/messenger-events'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractAnyToken(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })
  const member = await prisma.messengerParticipant.findFirst({ where: { conversationId: id, userId: user.userId } })
  if (!member) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403 })

  let title: string | undefined
  let avatarFile: File | undefined

  const ct = (req.headers.get('content-type') || '').toLowerCase()
  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    title = String(form.get('title') || '') || undefined
    const file = form.get('avatar')
    if (file instanceof File) avatarFile = file
  } else {
    const json = await req.json().catch(()=>({}))
    title = typeof json?.title === 'string' ? json.title : undefined
  }

  let avatarUrl: string | undefined
  if (avatarFile) {
    const key = generateFileKey(avatarFile.name, `messenger/avatars/${id}`)
    const uploadRes = await uploadFile({ file: avatarFile, key, contentType: avatarFile.type })
    avatarUrl = uploadRes.url
  }

  const updated = await prisma.messengerConversation.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.length > 0 ? title : null }),
      ...(avatarUrl !== undefined && { avatar: avatarUrl }),
      updatedAt: new Date(),
    },
  })
  const memberIds = (await prisma.messengerParticipant.findMany({ where: { conversationId: id }, select: { userId: true } })).map(m => m.userId)
  messengerBus.emitToUsers(memberIds, { type: 'conversation.updated', conversationId: id, data: updated, actorUserId: user.userId })
  return new Response(JSON.stringify({ ok: true, item: updated }), { status: 200 })
}

 
