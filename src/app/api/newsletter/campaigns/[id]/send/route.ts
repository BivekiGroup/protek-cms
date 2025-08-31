import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({} as any))
  const testEmail = body?.testEmail ? String(body.testEmail).trim().toLowerCase() : undefined

  // Load campaign
  let campaign: any = null
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.newsletterCampaign?.findUnique) {
      campaign = await anyPrisma.newsletterCampaign.findUnique({ where: { id } })
    }
  } catch {}
  if (!campaign) {
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id, subject, html, model FROM "newsletter_campaigns" WHERE id='${id.replace(/'/g, "''")}' LIMIT 1`)
    campaign = rows?.[0]
  }
  if (!campaign) return new Response(JSON.stringify({ ok: false, error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } })

  // Load recipients
  let recipients: string[] = []
  if (testEmail) {
    recipients = [testEmail]
  } else {
    try {
      const anyPrisma: any = prisma as any
      if (anyPrisma.newsletterSubscriber?.findMany) {
        const items = await anyPrisma.newsletterSubscriber.findMany({ where: { unsubscribedAt: null }, select: { email: true }, take: 100000 })
        recipients = items.map((x: any) => x.email)
      }
    } catch {}
    if (recipients.length === 0) {
      const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT email FROM "newsletter_subscribers" WHERE "unsubscribedAt" IS NULL`)
      recipients = rows.map((r) => r.email)
    }
  }

  if (!recipients.length) return new Response(JSON.stringify({ ok: false, error: 'no_recipients' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })

  const subject = String(campaign.subject)
  const html = String(campaign.html)

  // Test email: send immediately
  if (testEmail) {
    let sent = 0
    let failed = 0
    const errors: any[] = []
    try {
      await sendEmail({ to: testEmail, subject, html })
      sent++
    } catch (e: any) {
      failed++
      errors.push({ to: testEmail, error: String(e?.message || e) })
    }
    return new Response(JSON.stringify({ ok: failed === 0, sent, failed, errors }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }

  // Full campaign: run in background
  try {
    const anyPrisma: any = prisma as any
    if (anyPrisma.newsletterCampaign?.update) {
      await anyPrisma.newsletterCampaign.update({ where: { id }, data: { status: 'sending', sentAt: null } })
    } else {
      await prisma.$executeRawUnsafe(`UPDATE "newsletter_campaigns" SET status='sending', "sentAt"=NULL WHERE id='${id.replace(/'/g, "''")}'`)
    }
  } catch {}

  void (async () => {
    const startedAt = Date.now()
    const total = recipients.length
    let sent = 0
    let failed = 0
    console.log(`[newsletter] start ${id} total=${total}`)

    const concurrency = Math.max(1, Math.min(10, Number(process.env.SMTP_CONCURRENCY || 5)))
    const queue = [...recipients]
    const workers: Promise<void>[] = []

    for (let i = 0; i < concurrency; i++) {
      workers.push((async () => {
        while (queue.length) {
          const to = queue.shift() as string | undefined
          if (!to) break
          try {
            await sendEmail({ to, subject, html })
            sent++
            console.log('[newsletter] sent', to)
          } catch (e: any) {
            failed++
            console.warn('[newsletter] send fail', to, String(e?.message || e))
          }
        }
      })())
    }
    await Promise.all(workers)

    console.log(`[newsletter] done ${id} sent=${sent} failed=${failed} in ${Math.round((Date.now()-startedAt)/1000)}s`)

    try {
      const anyPrisma: any = prisma as any
      if (anyPrisma.newsletterCampaign?.update) {
        await anyPrisma.newsletterCampaign.update({ where: { id }, data: { status: 'sent', sentAt: new Date() } })
      } else {
        await prisma.$executeRawUnsafe(`UPDATE "newsletter_campaigns" SET status='sent', "sentAt"=now() WHERE id='${id.replace(/'/g, "''")}'`)
      }
    } catch (e) {
      console.warn('[newsletter] status update failed', e)
    }
    // If nothing was sent, mark campaign as failed
    if (sent === 0) {
      try {
        const anyPrisma: any = prisma as any
        if (anyPrisma.newsletterCampaign?.update) {
          await anyPrisma.newsletterCampaign.update({ where: { id }, data: { status: 'failed', sentAt: null } })
        } else {
          await prisma.$executeRawUnsafe(`UPDATE "newsletter_campaigns" SET status='failed', "sentAt"=NULL WHERE id='${id.replace(/'/g, "''")}'`)
        }
      } catch (e) {
        console.warn('[newsletter] status update (failed) failed', e)
      }
    }
  })()

  return new Response(JSON.stringify({ ok: true, status: 'sending', total: recipients.length }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
}
