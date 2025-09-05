import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { uploadBuffer } from '@/lib/s3'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  if (!id) return new Response(JSON.stringify({ ok: false, error: 'id required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
  // Обновим статус на canceled
  const job = await (prisma as any).zzapReportJob.update({ where: { id }, data: { status: 'canceled', error: 'stopped by user' } })
  try {
    const rows = (job.inputRows as any[]) as { article: string; brand: string }[]
    const results = (job.results as any[]) || []
    // Построим месячные заголовки хронологически по периодам задачи (как в финальном отчёте)
    function* eachMonth(from: Date, to: Date): Generator<Date> {
      const d = new Date(from.getFullYear(), from.getMonth(), 1)
      while (d <= to) { yield new Date(d); d.setMonth(d.getMonth() + 1) }
    }
    const ruGenitive = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
    function labelFor(d: Date) { return `${ruGenitive[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}` }
    const from = new Date(job.periodFrom)
    const to = new Date(job.periodTo)
    const monthLabels: string[] = []
    for (const dt of eachMonth(from, to)) monthLabels.push(labelFor(dt))
    const header = ['Артикул', 'Бренд', 'Цена 1', 'Цена 2', 'Цена 3', ...monthLabels]
    const aoa: any[][] = [['Частичный отчёт ZZAP (остановлен пользователем)'], header]
    const norm = (s: string) => (s || '').toString().trim()
    // Быстрый доступ по ключу article|brand
    const normKey = (a: string, b: string) => `${norm(a).toUpperCase().replace(/\s+/g, '')}|${norm(b).toUpperCase().replace(/\s+/g, '')}`
    const byKey = new Map<string, any>()
    results.forEach((r: any) => {
      const k = normKey(r?.article || '', r?.brand || '')
      if (k !== '|') byKey.set(k, r)
    })
    for (let i = 0; i < rows.length; i++) {
      const def = rows[i]
      const k = normKey(def.article, def.brand)
      const r = byKey.get(k) || results[i] || null
      const p = ((r as any)?.prices || []) as number[]
      const row: (string | number)[] = [norm(def.article), norm(def.brand), p[0] ?? '', p[1] ?? '', p[2] ?? '']
      const stats = ((r as any)?.stats || {}) as Record<string, number>
      for (const ml of monthLabels) row.push(stats[ml] ?? '')
      aoa.push(row)
    }
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    try { (ws['!merges'] = ws['!merges'] || []).push({ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }) } catch {}
    XLSX.utils.book_append_sheet(wb, ws, 'Отчёт')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const key = `reports/zzap/${id}-partial.xlsx`
    const uploaded = await uploadBuffer(buf, key, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').catch(() => null as any)
    const url = typeof uploaded === 'string' ? uploaded : uploaded?.url || key
    const updated = await (prisma as any).zzapReportJob.update({ where: { id }, data: { resultFile: url || key } })
    return new Response(JSON.stringify({ ok: true, status: updated.status, resultFile: url || key }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
  } catch {
    // Даже если XLSX не удалось сформировать, возвращаем 200 со статусом
    return new Response(JSON.stringify({ ok: true, status: 'canceled' }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
}

