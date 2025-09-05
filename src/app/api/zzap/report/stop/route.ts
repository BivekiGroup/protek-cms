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
    // Построим частичный XLSX по уже полученным результатам
    const header = ['Артикул', 'Бренд', 'Цена 1', 'Цена 2', 'Цена 3']
    const aoa: any[][] = [['Частичный отчёт ZZAP (остановлен пользователем)'], header]
    const norm = (s: string) => (s || '').toString().trim()
    for (let i = 0; i < rows.length; i++) {
      const def = rows[i]
      const r = results[i] as any
      const p = (r?.prices || []) as number[]
      aoa.push([norm(def.article), norm(def.brand), p[0] ?? '', p[1] ?? '', p[2] ?? ''])
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

