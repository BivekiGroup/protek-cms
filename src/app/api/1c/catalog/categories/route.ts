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

const categorySchema = z.object({
  category_code: z.string().trim().min(1),
  category_name: z.string().trim().min(1),
  category_head_code: z.string().trim().optional(),
  category_head_name: z.string().trim().optional(),
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
  const parsed = items.map((it: any) => categorySchema.parse(it))

  const results: any[] = []
  for (const c of parsed) {
    let parentId: string | undefined
    if (c.category_head_code) {
      let head = await prisma.category.findFirst({ where: { code: c.category_head_code } })
      if (!head) {
        head = await prisma.category.create({ data: { name: c.category_head_name || c.category_head_code, slug: slugify(c.category_head_name || c.category_head_code), code: c.category_head_code } })
      }
      parentId = head.id
    }

    let cat = await prisma.category.findFirst({ where: { code: c.category_code } })
    if (!cat) {
      cat = await prisma.category.create({ data: { name: c.category_name, slug: slugify(c.category_name), code: c.category_code, headCode: c.category_head_code, headName: c.category_head_name, parentId } })
      results.push({ code: c.category_code, status: 'created' })
    } else {
      await prisma.category.update({ where: { id: cat.id }, data: { name: c.category_name, headCode: c.category_head_code, headName: c.category_head_name, parentId } })
      results.push({ code: c.category_code, status: 'updated' })
    }
  }

  return new Response(JSON.stringify({ ok: true, items: results }), { status: 200, headers })
}

function slugify(input: string) {
  return (input || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s/_-]+/gi, '')
    .replace(/[\s/_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

