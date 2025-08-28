import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function getCorsHeaders() {
  const isDev = process.env.NODE_ENV !== 'production'
  const allowedOrigin = process.env.FRONTEND_ORIGIN || (isDev ? 'http://localhost:3001' : 'https://protekauto.ru')
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
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

const itemSchema = z.object({
  sku: z.string().trim().min(1),
  stock: z.number().int().nonnegative(),
})

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: getCorsHeaders() })
}

export async function POST(req: NextRequest) {
  const headers = new Headers(getCorsHeaders())
  headers.set('content-type', 'application/json; charset=utf-8')

  const auth = checkAuth(req)
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers })
  }

  let body: any
  try {
    body = await req.json()
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers })
  }

  const items = Array.isArray(body?.items) ? body.items : [body]
  const parsed = items.map((it: any) => itemSchema.parse(it))

  const results: any[] = []
  for (const it of parsed) {
    const article = normalizeArticle(it.sku)
    const product = await prisma.product.findFirst({ where: { article }, select: { id: true } })
    if (!product) {
      results.push({ sku: it.sku, status: 'not_found' })
      continue
    }
    await prisma.product.update({ where: { id: product.id }, data: { stock: it.stock } })
    results.push({ sku: it.sku, status: 'updated', stock: it.stock })
  }

  return new Response(JSON.stringify({ ok: true, items: results }), { status: 200, headers })
}

function normalizeArticle(article?: string | null) {
  if (!article) return ''
  return article.replace(/\s+/g, '').replace(/[-–—]+/g, '').trim().toUpperCase()
}

