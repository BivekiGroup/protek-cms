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
  // Принимаем цену как строку или число (включая 0)
  price: z.union([
    z.string().trim().min(1),
    z.number().nonnegative()
  ]),
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
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers })
  }

  const items = Array.isArray(body?.items) ? body.items : [body]
  let parsed: Array<z.infer<typeof itemSchema>>
  try {
    parsed = items.map((it: any) => itemSchema.parse(it))
  } catch (e) {
    if (e instanceof z.ZodError) {
      return new Response(JSON.stringify({ ok: false, error: 'Validation failed', issues: e.issues }), { status: 400, headers })
    }
    throw e
  }

  const results: any[] = []
  for (const it of parsed) {
    const article = normalizeArticle(it.sku)
    const price = parsePrice(it.price)
    const product = await prisma.product.findFirst({ where: { article }, select: { id: true } })
    if (!product) {
      results.push({ sku: it.sku, status: 'not_found' })
      continue
    }
    await prisma.product.update({ where: { id: product.id }, data: { retailPrice: price } })
    results.push({ sku: it.sku, status: 'updated', price })
  }

  return new Response(JSON.stringify({ ok: true, items: results }), { status: 200, headers })
}

function parsePrice(s: string | number): number {
  // convert "1 234,56" or "1234.56" or 1234 to number
  let n: number
  if (typeof s === 'number') {
    n = s
  } else {
    const cleaned = s.replace(/\s+/g, '').replace(',', '.')
    n = Number.parseFloat(cleaned)
  }
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function normalizeArticle(article?: string | null) {
  if (!article) return ''
  return article.replace(/\s+/g, '').replace(/[-–—]+/g, '').trim().toUpperCase()
}
