import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.newsletterSubscriber?.findMany) {
      const items = await anyPrisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 })
      return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    id text primary key,
    email text unique not null,
    "createdAt" timestamptz not null default now(),
    "unsubscribedAt" timestamptz
  )`)
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id, email, "createdAt", "unsubscribedAt" FROM "newsletter_subscribers" ORDER BY "createdAt" DESC LIMIT 1000`)
  return new Response(JSON.stringify({ ok: true, items: rows }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}
