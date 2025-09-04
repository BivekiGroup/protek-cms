import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getClientInfo } from '@/lib/audit'

const schema = z.object({
  clientId: z.string().optional(),
  sessionId: z.string().optional(),
  productId: z.string().optional(),
  offerKey: z.string().optional(),
  article: z.string().optional(),
  brand: z.string().optional(),
  referrer: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const body = schema.parse(json)
    const { ipAddress: ip, userAgent } = getClientInfo(req.headers)

    await prisma.productViewEvent.create({
      data: {
        clientId: body.clientId,
        sessionId: body.sessionId,
        productId: body.productId,
        offerKey: body.offerKey,
        article: body.article,
        brand: body.brand,
        referrer: body.referrer,
        ip,
        userAgent,
      }
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 })
  }
}


