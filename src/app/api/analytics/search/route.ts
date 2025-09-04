import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getClientInfo } from '@/lib/audit'

const schema = z.object({
  clientId: z.string().optional(),
  sessionId: z.string().optional(),
  query: z.string().min(1),
  brand: z.string().optional(),
  article: z.string().optional(),
  filters: z.unknown().optional(),
  resultsCount: z.number().int().nonnegative().default(0),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const body = schema.parse(json)
    const { ipAddress: ip, userAgent } = getClientInfo(req.headers)

    await prisma.searchEvent.create({
      data: {
        clientId: body.clientId,
        sessionId: body.sessionId,
        query: body.query,
        brand: body.brand,
        article: body.article,
        filters: (body.filters as any) ?? undefined,
        resultsCount: body.resultsCount,
        ip,
        userAgent,
      }
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 })
  }
}


