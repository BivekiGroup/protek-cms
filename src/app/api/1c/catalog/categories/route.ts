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
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers })
  }

  // Accept preferred root key `categories` (docs), keep back-compat with `items` and common typo `categorys`.
  const rootArray = Array.isArray(body?.categories)
    ? body.categories
    : Array.isArray(body?.categorys)
      ? body.categorys
      : Array.isArray(body?.items)
        ? body.items
        : Array.isArray(body)
          ? body
          : undefined

  if (!rootArray) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid payload: expected array under 'categories' (preferred) or 'items' (compat)", example: { categories: [{ category_code: '001254', category_name: 'Ремни ГРМ', category_head_code: '151554', category_head_name: 'ГРМ, рем. комплекты и тд' }] } }),
      { status: 400, headers }
    )
  }

  const items = rootArray

  // optional max batch limit (consistent with other 1C endpoints)
  const maxBatch = Number(process.env.ONEC_MAX_BATCH_SIZE || 1000)
  if (items.length > maxBatch) {
    return new Response(
      JSON.stringify({ ok: false, error: `Too many items: ${items.length} > ${maxBatch}` }),
      { status: 422, headers }
    )
  }
  let parsed: Array<z.infer<typeof categorySchema>>
  try {
    parsed = items.map((it: any) => categorySchema.parse(it))
  } catch (e) {
    if (e instanceof z.ZodError) {
      return new Response(JSON.stringify({ ok: false, error: 'Validation failed', issues: e.issues }), { status: 400, headers })
    }
    throw e
  }

  const results: any[] = []
  for (const c of parsed) {
    let parentId: string | undefined
    if (c.category_head_code) {
      let head = await prisma.category.findFirst({ where: { code: c.category_head_code } })
      if (!head) {
        const headName = c.category_head_name || c.category_head_code
        const headSlug = slugify(`${headName}-${c.category_head_code}`)
        head = await prisma.category.create({ data: { name: headName, slug: headSlug, code: c.category_head_code } })
      }
      parentId = head.id
    }

    let cat = await prisma.category.findFirst({ where: { code: c.category_code } })
    if (!cat) {
      const catSlug = slugify(`${c.category_name}-${c.category_code}`)
      cat = await prisma.category.create({ data: { name: c.category_name, slug: catSlug, code: c.category_code, headCode: c.category_head_code, headName: c.category_head_name, parentId } })
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
