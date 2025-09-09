 
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeaders, getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = extractTokenFromHeaders(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q) return new Response(JSON.stringify({ ok: true, items: [] }), { status: 200 })
  const items = await prisma.messengerMessage.findMany({
    where: { conversationId: id, content: { contains: q, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, content: true, createdAt: true }
  })
  return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}


