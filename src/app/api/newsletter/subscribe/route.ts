import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const email = String(body?.email || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
  const now = new Date()
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.newsletterSubscriber?.upsert) {
      await anyPrisma.newsletterSubscriber.upsert({
        where: { email },
        update: { unsubscribedAt: null },
        create: { email, createdAt: now },
      })
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    id text primary key,
    email text unique not null,
    "createdAt" timestamptz not null default now(),
    "unsubscribedAt" timestamptz
  )`)
  const { randomUUID } = await import('crypto')
  try {
    await prisma.$executeRawUnsafe(`INSERT INTO "newsletter_subscribers" (id, email) VALUES ('${randomUUID()}', '${email.replace(/'/g, "''")}') ON CONFLICT (email) DO UPDATE SET "unsubscribedAt"=NULL`)
  } catch {}
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

