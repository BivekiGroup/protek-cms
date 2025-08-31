import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({} as any))
  const unsub = !!body?.unsubscribed
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.newsletterSubscriber?.update) {
      await anyPrisma.newsletterSubscriber.update({ where: { id }, data: { unsubscribedAt: unsub ? new Date() : null } })
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    id text primary key,
    email text unique not null,
    "createdAt" timestamptz not null default now(),
    "unsubscribedAt" timestamptz
  )`)
  await prisma.$executeRawUnsafe(`UPDATE "newsletter_subscribers" SET "unsubscribedAt"=${unsub ? 'now()' : 'NULL'} WHERE id='${id.replace(/'/g, "''")}'`)
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

