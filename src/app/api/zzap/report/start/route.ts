import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeArticle(s?: string | null) {
  if (!s) return ''
  return s.replace(/\s+/g, '').replace(/[-–—]+/g, '').trim().toUpperCase()
}
function normalizeBrand(s?: string | null) {
  return (s || '').trim().toUpperCase()
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ ok: false, error: 'Ожидается multipart/form-data' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
    const form = await req.formData()
    const file = form.get('file')
    const periodFrom = form.get('periodFrom') as string | null
    const periodTo = form.get('periodTo') as string | null
    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ ok: false, error: 'Не передан файл' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
    if (!periodFrom || !periodTo) {
      return new Response(JSON.stringify({ ok: false, error: 'Не передан период (periodFrom, periodTo)' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }

    const from = new Date(periodFrom)
    const to = new Date(periodTo)
    if (isNaN(+from) || isNaN(+to) || from > to) {
      return new Response(JSON.stringify({ ok: false, error: 'Некорректный период' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    // detect excel vs csv
    let rows: { article: string; brand: string }[] = []
    try {
      const workbook = XLSX.read(buf, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const table = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 }) as any[][]
      if (!table || table.length < 2) throw new Error('Пустой файл')
      const headers = (table[0] || []).map((h) => String(h || '').trim().toLowerCase())
      // allow variations
      const artIdx = headers.findIndex((h) => ['артикул', 'article', 'sku'].includes(h))
      const brandIdx = headers.findIndex((h) => ['бренд', 'brand', 'марка'].includes(h))
      if (artIdx < 0 || brandIdx < 0) {
        return new Response(JSON.stringify({ ok: false, error: 'Файл должен содержать столбцы: Артикул, Бренд' }), { status: 422, headers: { 'content-type': 'application/json; charset=utf-8' } })
      }
      const dataRows = table.slice(1).filter((r) => r && r.some((c) => String(c || '').trim()))
      rows = dataRows.map((r) => ({ article: normalizeArticle(String(r[artIdx] || '')), brand: normalizeBrand(String(r[brandIdx] || '')) }))
    } catch (e) {
      // try CSV
      const text = buf.toString('utf-8')
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) throw e
      const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase())
      const artIdx = headers.findIndex((h) => ['артикул', 'article', 'sku'].includes(h))
      const brandIdx = headers.findIndex((h) => ['бренд', 'brand', 'марка'].includes(h))
      if (artIdx < 0 || brandIdx < 0) {
        return new Response(JSON.stringify({ ok: false, error: 'CSV: нужны столбцы Артикул, Бренд' }), { status: 422, headers: { 'content-type': 'application/json; charset=utf-8' } })
      }
      rows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((v) => v.replace(/"/g, '').trim())
        return { article: normalizeArticle(cols[artIdx] || ''), brand: normalizeBrand(cols[brandIdx] || '') }
      })
    }

    // sanitize
    rows = rows.filter((r) => r.article && r.brand)
    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Не найдено валидных строк' }), { status: 422, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
    // limit
    if (rows.length > 500) rows = rows.slice(0, 500)

    const job = await prisma.zzapReportJob.create({
      data: {
        status: 'pending',
        periodFrom: from,
        periodTo: to,
        total: rows.length,
        processed: 0,
        inputRows: rows,
      }
    })

    return new Response(JSON.stringify({ ok: true, jobId: job.id, total: job.total }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
}

