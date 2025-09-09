import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractAnyToken, getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = extractAnyToken(req.headers)
  const user = getUserFromToken(token)
  if (!user?.userId) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 })

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() || ''
  const skip = Number(url.searchParams.get('skip') || '0') || 0
  const take = Math.min(50, Math.max(1, Number(url.searchParams.get('take') || '20') || 20))

  const where: any = { id: { not: user.userId } }
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }
  const items = await prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } })
  const nextSkip = items.length === take ? skip + take : null
  return new Response(JSON.stringify({ ok: true, items, nextSkip }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

// removed duplicate implementation


