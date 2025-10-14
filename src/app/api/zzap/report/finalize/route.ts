import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { uploadBuffer } from '@/lib/s3'

export const dynamic = 'force-dynamic'

function* eachMonth(from: Date, to: Date): Generator<Date> {
  const d = new Date(from.getFullYear(), from.getMonth(), 1)
  while (d <= to) { yield new Date(d); d.setMonth(d.getMonth() + 1) }
}
const ruGenitive = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
function labelFor(d: Date) { return `${ruGenitive[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}` }

const extractRows = (input: any): { article: string; brand: string }[] => {
  const rows: { article: string; brand: string }[] = []
  const push = (row: any) => {
    if (!row || typeof row !== 'object') return
    const article = typeof row.article === 'string' ? row.article : ''
    const brand = typeof row.brand === 'string' ? row.brand : ''
    if (article) rows.push({ article, brand })
  }
  if (Array.isArray(input)) {
    for (const row of input) push(row)
  } else if (input && typeof input === 'object') {
    if (Array.isArray(input.rows)) {
      for (const row of input.rows) push(row)
    } else if (Array.isArray((input as any).items)) {
      for (const row of (input as any).items) push(row)
    } else {
      // some older jobs might store a single row object
      push(input)
    }
  }
  return rows
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id') || ''
    if (!id) return new Response(JSON.stringify({ ok: false, error: 'id required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
    const job = await (prisma as any).zzapReportJob.findUnique({ where: { id } })
    if (!job) return new Response(JSON.stringify({ ok: false, error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } })
    let rows = extractRows(job.inputRows)
    const results = (job.results as any[]) || []
    if (!rows.length && Array.isArray(results)) {
      rows = results
        .map((r: any) => ({
          article: typeof r?.article === 'string' ? r.article : '',
          brand: typeof r?.brand === 'string' ? r.brand : '',
        }))
        .filter((r) => r.article)
    }
    const from = new Date(job.periodFrom)
    const to = new Date(job.periodTo)
    const monthLabels: string[] = []
    for (const dt of eachMonth(from, to)) monthLabels.push(labelFor(dt))
    const title = [`Отчёт ZZAP на ${new Date().toLocaleDateString('ru-RU')}`]
    const header = ['Артикул', 'Бренд', 'Цена 1', 'Цена 2', 'Цена 3', ...monthLabels]
    const norm = (s: string) => (s || '').toString().trim().toUpperCase().replace(/\s+/g, '')
    const keyOf = (a: string, b: string) => `${norm(a)}|${norm(b)}`
    const byKey = new Map<string, any>()
    for (const r of results || []) {
      if (!r || typeof r !== 'object') continue
      const k = keyOf((r as any).article || '', (r as any).brand || '')
      if (k !== '|') byKey.set(k, r)
    }
    const aoa: any[][] = [title, header]
    for (let i = 0; i < rows.length; i++) {
      const def = rows[i]
      const k = keyOf(def.article, def.brand)
      let r = byKey.get(k) || results[i] || null
      if (!r) r = { article: def.article, brand: def.brand, prices: [], stats: {} }
      const row: (string | number)[] = [def.article, def.brand]
      const p = ((r as any).prices || []) as number[]
      row.push(p[0] ?? '', p[1] ?? '', p[2] ?? '')
      for (const ml of monthLabels) {
        const v = ((r as any).stats && (r as any).stats[ml]) ?? ''
        row.push(v)
      }
      aoa.push(row)
    }
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    try { (ws['!merges'] = ws['!merges'] || []).push({ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }) } catch {}
    XLSX.utils.book_append_sheet(wb, ws, 'Отчёт')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const key = `reports/zzap/${id}.xlsx`
    const uploaded = await uploadBuffer(buf, key, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').catch(() => null as any)
    const url = typeof uploaded === 'string' ? uploaded : uploaded?.url || null
    await (prisma as any).zzapReportJob.update({ where: { id }, data: { status: 'done', resultFile: url || key } })
    return new Response(JSON.stringify({ ok: true, resultFile: url || key }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
}
