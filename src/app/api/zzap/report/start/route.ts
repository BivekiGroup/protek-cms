import { NextRequest } from 'next/server'
import { POST as processJob } from '../process/route'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function parseRows(buf: Buffer, filename?: string): { article: string; brand: string }[] {
  try {
    const ext = (filename || '').toLowerCase()
    // Common header synonyms (Unicode-friendly: avoid \b which doesn't work with Cyrillic in JS)
    const norm = (s: string) => (s || '').toString().trim().toLowerCase()
    const isHeaderArticle = (s: string) => /(артикул|номер|article|part|number)/i.test(norm(s))
    const isHeaderBrand = (s: string) => /(бренд|марка|производитель|brand|manufacturer)/i.test(norm(s))

    if (ext.endsWith('.csv')) {
      const textRaw = buf.toString('utf-8')
      const text = textRaw.replace(/^\uFEFF/, '') // strip BOM
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
      const out: { article: string; brand: string }[] = []
      if (!lines.length) return out

      // Detect delimiter (prefer ; then , then tab)
      const detectDelim = (s: string) => {
        if (s.includes(';')) return ';'
        if (s.includes('\t')) return '\t'
        return ','
      }
      const first = lines[0]
      const delim = detectDelim(first)
      const firstParts = first.split(new RegExp(delim === '\t' ? '\\t' : delim))

      // Decide columns mapping using header if present
      let hasHeader = false
      let artIdx = 0
      let brandIdx = 1
      if (firstParts.length >= 2) {
        const c0 = (firstParts[0] || '').trim()
        const c1 = (firstParts[1] || '').trim()
        if ((isHeaderArticle(c0) && isHeaderBrand(c1)) || (isHeaderBrand(c0) && isHeaderArticle(c1))) {
          hasHeader = true
          artIdx = isHeaderArticle(c0) ? 0 : 1
          brandIdx = isHeaderBrand(c0) ? 0 : 1
        }
      }

      // If more than 2 columns and explicit headers present, locate precise indices
      if (!hasHeader && firstParts.length > 2) {
        const lower = firstParts.map((v) => (v || '').toString().trim())
        const ai = lower.findIndex(isHeaderArticle)
        const bi = lower.findIndex(isHeaderBrand)
        if (ai >= 0 || bi >= 0) {
          hasHeader = true
          if (ai >= 0) artIdx = ai
          if (bi >= 0) brandIdx = bi
        }
      }

      const startIdx = hasHeader ? 1 : 0
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(new RegExp(delim === '\t' ? '\\t' : delim))
        if (!parts.length) continue
        // Heuristic mapping if header unknown or indexes out of bounds
        const col0 = (parts[0] || '').trim()
        const col1 = (parts[1] || '').trim()
        let article = ''
        let brand = ''
        if (artIdx < parts.length || brandIdx < parts.length) {
          const a = (parts[artIdx] || '').trim()
          const b = (parts[brandIdx] || '').trim()
          article = a
          brand = b
        } else {
          // Fallback classify
          const isArt = (s: string) => /[0-9]/.test(s) && s.replace(/\s+/g,'').length >= 3
          const isBrandGuess = (s: string) => /[A-Za-zА-Яа-я]/.test(s) && !(isArt(s) && s.length > 6)
          if (isBrandGuess(col0) && isArt(col1)) { article = col1; brand = col0 }
          else { article = col0; brand = col1 }
        }
        if (article) out.push({ article, brand })
      }
      return out
    }
    const wb = XLSX.read(buf, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 }) as any[][]
    const out: { article: string; brand: string }[] = []
    const header = (aoa?.[0] || []).map((v: any) => String(v || '').trim())
    const hasHeaders = header.some(h => isHeaderArticle(h)) || header.some(h => isHeaderBrand(h))
    // Try to find specific column indices by header
    let artIdx = 0
    let brandIdx = 1
    if (hasHeaders) {
      const idxA = header.findIndex(isHeaderArticle)
      const idxB = header.findIndex(isHeaderBrand)
      if (idxA >= 0) artIdx = idxA
      if (idxB >= 0) brandIdx = idxB
    }
    // Helper: decide which column is article/brand by heuristics
    const classify = (a: string, b: string) => {
      const A = (a || '').trim()
      const B = (b || '').trim()
      const isArt = (s: string) => /[0-9]/.test(s) && s.replace(/\s+/g,'').length >= 3
      const isBrand = (s: string) => /[A-Za-zА-Яа-я]/.test(s) && !(isArt(s) && s.length > 6)
      if (hasHeaders) return { article: A, brand: B } // order will be applied via indices
      if (isBrand(A) && isArt(B)) return { article: B, brand: A }
      return { article: A, brand: B }
    }
    for (let i = hasHeaders ? 1 : 0; i < aoa.length; i++) {
      const row = aoa[i]
      // Use detected column indices if headers present; else default to first two
      const a0 = String(row?.[hasHeaders ? artIdx : 0] ?? '').trim()
      const b1 = String(row?.[hasHeaders ? brandIdx : 1] ?? '').trim()
      if (!a0 && !b1) continue
      const { article, brand } = classify(a0, b1)
      if (article) out.push({ article, brand })
    }
    return out
  } catch { return [] }
}

export async function POST(req: NextRequest) {
  try {
    const origin = (() => { try { const u = new URL(req.url); return `${u.protocol}//${u.host}` } catch { return '' } })()
    const form = await req.formData()
    const file = form.get('file') as File | null
    const periodFrom = form.get('periodFrom') as string | null
    const periodTo = form.get('periodTo') as string | null
    if (!file) {
      return new Response(JSON.stringify({ ok: false, error: 'file required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
    if (!periodFrom || !periodTo) {
      return new Response(JSON.stringify({ ok: false, error: 'periodFrom/periodTo required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const rows = parseRows(buf, file.name)
    const modeRaw = String(form.get('mode') || 'full').toLowerCase()
    const includeStats = modeRaw !== 'prices-only'
    const bucketRaw = String(form.get('deliveryBucket') || 'any').toLowerCase()
    const allowedBuckets = new Set(['any', '0-3', '3-7', '8+'])
    const deliveryBucket = allowedBuckets.has(bucketRaw) ? (bucketRaw as 'any' | '0-3' | '3-7' | '8+') : 'any'
    const inputPayload = {
      rows,
      options: {
        includeStats,
        deliveryBucket,
      },
    }
    let job
    try {
      job = await (prisma as any).zzapReportJob.create({
        data: {
          status: 'pending',
          periodFrom: new Date(periodFrom),
          periodTo: new Date(periodTo),
          total: rows.length,
          processed: 0,
          originalFilename: (file.name || '').slice(0, 255),
          inputRows: inputPayload,
          results: Array.from({ length: rows.length }).fill(null)
        }
      })
    } catch {
      // Backward-compatible fallback if DB doesn't have originalFilename yet
      job = await (prisma as any).zzapReportJob.create({
        data: {
          status: 'pending',
          periodFrom: new Date(periodFrom),
          periodTo: new Date(periodTo),
          total: rows.length,
          processed: 0,
          inputRows: inputPayload,
          results: Array.from({ length: rows.length }).fill(null)
        }
      })
    }
    // Rough ETA: base per-item processing + expected inter-item delay
    const estItemMs = Number(process.env.ZZAP_ESTIMATE_ITEM_MS || 12000)
    const delayBase = Number(process.env.ZZAP_BETWEEN_ITEMS_DELAY_MS || 2000)
    const delayJitter = Number(process.env.ZZAP_BETWEEN_ITEMS_JITTER_MS || 3000)
    const expectedInterDelay = delayBase + Math.max(0, delayJitter) / 2
    const perItemMs = estItemMs + expectedInterDelay
    const etaMs = Math.ceil((rows.length || 0) * Math.max(1000, perItemMs))
    const etaText = (() => {
      const s = Math.round(etaMs / 1000)
      const mm = Math.floor(s / 60)
      const ss = s % 60
      if (mm <= 0) return `~${s} сек`
      if (mm < 60) return `~${mm} мин ${ss} сек`
      const hh = Math.floor(mm / 60)
      const m2 = mm % 60
      return `~${hh} ч ${m2} мин`
    })()
    // Trigger processing asynchronously: external URL, localhost, and direct in-process call
    ;(async () => {
      try {
        const url = `${origin}/api/zzap/report/process?id=${job.id}`
        await fetch(url, { method: 'POST' })
      } catch {}
      try {
        const localUrl = `http://127.0.0.1:3000/api/zzap/report/process?id=${job.id}`
        await fetch(localUrl, { method: 'POST' })
      } catch {}
      try {
        // Last resort: call the handler directly to avoid networking issues
        const u = new URL(`/api/zzap/report/process?id=${job.id}`, 'http://localhost')
        const req2 = new NextRequest(u.toString(), { method: 'POST' } as any)
        // Do not await; run detached
        setTimeout(() => { processJob(req2).catch(() => {}) }, 0)
      } catch {}
    })().catch(() => null as any)
    return new Response(JSON.stringify({
      ok: true,
      jobId: job.id,
      total: rows.length,
      etaMs,
      etaText,
      options: { includeStats, deliveryBucket },
    }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
}
