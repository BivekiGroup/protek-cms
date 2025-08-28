import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function getCorsHeaders() {
  const isDev = process.env.NODE_ENV !== 'production'
  const allowedOrigin = process.env.FRONTEND_ORIGIN || (isDev ? 'http://localhost:3001' : 'https://protekauto.ru')
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Forwarded-For',
    'Cache-Control': 'no-store'
  }
}

function checkAuth(req: NextRequest): { ok: true } | { ok: false; status: number; body: any } {
  const apiKey = req.headers.get('x-api-key') || ''
  const expected = process.env.ONEC_API_TOKEN || ''
  if (!expected || apiKey !== expected) {
    return { ok: false, status: 401, body: { ok: false, error: 'Unauthorized' } }
  }
  return { ok: true }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: getCorsHeaders() })
}

export async function GET(req: NextRequest) {
  const headers = new Headers(getCorsHeaders())
  headers.set('content-type', 'application/json; charset=utf-8')

  const auth = checkAuth(req)
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers })
  }

  // NOTE: История посещений не трекается в текущей схеме явно.
  // Возвращаем последние изменения товаров как заглушку.
  const limit = Number(new URL(req.url).searchParams.get('limit') || 100)
  const history = await prisma.productHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 500),
    include: { product: true, user: true },
  })

  const items = history.map(h => ({
    user: {
      code: h.user?.id || '',
      name: h.user ? `${h.user.firstName} ${h.user.lastName}`.trim() : '',
      inn: null,
    },
    sku: h.product?.article || '',
    sku_date_visit: h.createdAt.toISOString(),
    sku_stock: h.product?.stock ?? 0,
  }))

  return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers })
}

