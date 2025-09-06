import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

function getCorsHeaders() {
  const isDev = process.env.NODE_ENV !== 'production'
  const allowedOrigin = process.env.FRONTEND_ORIGIN || process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || (isDev ? 'http://localhost:3001' : 'https://protekauto.ru')
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Forwarded-For',
    'Cache-Control': 'no-store',
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: getCorsHeaders() })
}

const schema = z.object({
  clientId: z.string().trim().optional(),
  sessionId: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  offerKey: z.string().trim().optional(),
  article: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  referrer: z.string().trim().optional(),
})

export async function POST(req: NextRequest) {
  const headers = new Headers(getCorsHeaders())
  headers.set('content-type', 'application/json; charset=utf-8')

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers })
  }
  let payload: z.infer<typeof schema>
  try { payload = schema.parse(body) } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: 'Validation error', details: e?.errors || String(e) }), { status: 422, headers })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null
  const userAgent = req.headers.get('user-agent') || null

  try {
    await prisma.productViewEvent.create({
      data: {
        clientId: payload.clientId,
        sessionId: payload.sessionId,
        productId: payload.productId,
        offerKey: payload.offerKey,
        article: payload.article,
        brand: payload.brand,
        referrer: payload.referrer,
        ip: ip || undefined,
        userAgent: userAgent || undefined,
      }
    })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers })
  }
}
