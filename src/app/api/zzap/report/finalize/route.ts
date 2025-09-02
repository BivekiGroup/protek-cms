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

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id') || ''
    if (!id) return new Response(JSON.stringify({ ok: false, error: 'id required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
    let job = await (prisma as any).zzapReportJob.findUnique({ where: { id } })
    if (!job) return new Response(JSON.stringify({ ok: false, error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } })
    const rows = (job.inputRows as any[]) as { article: string; brand: string }[]
    const results = (job.results as any[]) || []
    const from = new Date(job.periodFrom)
    const to = new Date(job.periodTo)
    const monthLabels: string[] = []
    for (const dt of eachMonth(from, to)) monthLabels.push(labelFor(dt))
    const title = [`Отчёт ZZAP на ${new Date().toLocaleDateString('ru-RU')}`]
    const header = ['Артикул', 'Бренд', 'Цена 1', 'Цена 2', 'Цена 3', ...monthLabels]
    const aoa: any[][] = [title, header]
    for (let i = 0; i < rows.length; i++) {
      const r = results[i] || { article: rows[i].article, brand: rows[i].brand, prices: [], stats: {} }
      const row = [r.article, r.brand]
      const p = (r.prices || []) as number[]
      row.push(p[0] ?? '', p[1] ?? '', p[2] ?? '')
      for (const ml of monthLabels) {
        const v = (r.stats && (r.stats as any)[ml]) ?? ''
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
