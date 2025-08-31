import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.newsletterCampaign?.findMany) {
      const items = await anyPrisma.newsletterCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
      return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "newsletter_campaigns" (
    id text primary key,
    subject text not null,
    html text not null,
    model text,
    status text not null default 'draft',
    "createdAt" timestamptz not null default now(),
    "sentAt" timestamptz
  )`)
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id, subject, model, status, "createdAt", "sentAt" FROM "newsletter_campaigns" ORDER BY "createdAt" DESC LIMIT 100`)
  return new Response(JSON.stringify({ ok: true, items: rows }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const subject = String(body?.subject || '').slice(0, 500)
  const html = String(body?.html || '')
  const model = body?.model ? String(body.model).slice(0, 200) : null
  if (!subject || !html) {
    return new Response(JSON.stringify({ ok: false, error: 'subject_and_html_required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.newsletterCampaign?.create) {
      const created = await anyPrisma.newsletterCampaign.create({ data: { subject, html, model } })
      return new Response(JSON.stringify({ ok: true, id: created.id }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch {}
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "newsletter_campaigns" (
    id text primary key,
    subject text not null,
    html text not null,
    model text,
    status text not null default 'draft',
    "createdAt" timestamptz not null default now(),
    "sentAt" timestamptz
  )`)
  const id = randomUUID()
  await prisma.$executeRawUnsafe(`INSERT INTO "newsletter_campaigns" (id, subject, html, model) VALUES ('${id}', '${subject.replace(/'/g, "''")}', '${html.replace(/'/g, "''")}', ${model ? `'${model.replace(/'/g, "''")}'` : 'NULL'})`)
  return new Response(JSON.stringify({ ok: true, id }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

