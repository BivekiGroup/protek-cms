import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import puppeteer, { Page } from 'puppeteer'
import * as XLSX from 'xlsx'
import { uploadBuffer } from '@/lib/s3'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ZZAP_BASE = process.env.ZZAP_BASE || 'https://www.zzap.ru'
const ZZAP_TIMEOUT_MS = Number(process.env.ZZAP_TIMEOUT_MS || 30000)

function normalizePrice(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, '').replace(/\s+/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

async function loginAndGetPage(): Promise<Page> {
  const email = process.env.ZZAP_EMAIL
  const password = process.env.ZZAP_PASSWORD
  if (!email || !password) throw new Error('ZZAP_EMAIL/ZZAP_PASSWORD not configured')
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(ZZAP_TIMEOUT_MS)
  page.setDefaultTimeout(ZZAP_TIMEOUT_MS)
  await page.setViewport({ width: 1440, height: 900 })
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36')
  await page.goto(`${ZZAP_BASE}/user/logon.aspx`, { waitUntil: 'domcontentloaded' })
  // Minimal login flow
  const emailSel = '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_AddrEmail1TextBox_I, input[type="email"]'
  const passSel = '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_PasswordTextBox_I, input[type="password"]'
  await page.type(emailSel, email).catch(()=>{})
  await page.type(passSel, password).catch(()=>{})
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(()=>{}),
    page.keyboard.press('Enter'),
  ])
  return page
}

async function openSearch(page: Page, article: string) {
  const urls = [
    `${ZZAP_BASE}/search/?article=${encodeURIComponent(article)}`,
    `${ZZAP_BASE}/search?article=${encodeURIComponent(article)}`,
    `${ZZAP_BASE}/search?txt=${encodeURIComponent(article)}`,
    `${ZZAP_BASE}/catalog/?q=${encodeURIComponent(article)}`,
  ]
  for (const url of urls) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: ZZAP_TIMEOUT_MS }); return } catch {}
  }
  await page.goto(ZZAP_BASE, { waitUntil: 'domcontentloaded' })
}

async function scrapeTop3Prices(page: Page, brand: string): Promise<number[]> {
  try {
    // Generic extraction: scan rows containing brand and collect price cells
    const prices = await page.evaluate((brandUpper: string) => {
      function text(el: Element | null | undefined) { return (el?.textContent || '').trim() }
      const rows = Array.from(document.querySelectorAll('table tr, .table tr, .gridview tr'))
      const matches: number[] = []
      for (const tr of rows) {
        const rowText = (tr as HTMLElement).innerText?.toUpperCase() || ''
        if (!rowText || !rowText.includes(brandUpper)) continue
        const priceCells = Array.from(tr.querySelectorAll('td, div, span')).map((c) => text(c)).filter(Boolean)
        for (const s of priceCells) {
          const m = s.match(/\d[\d\s.,]*\s*₽/)
          if (m) {
            const cleaned = m[0].replace(/[^0-9.,]/g, '').replace(/\s+/g, '').replace(',', '.')
            const n = parseFloat(cleaned)
            if (Number.isFinite(n)) matches.push(n)
          }
        }
        if (matches.length >= 3) break
      }
      return matches.slice(0, 3)
    }, brand.toUpperCase())
    return prices
  } catch { return [] }
}

async function openStats(page: Page): Promise<Page> {
  // Try to open first link to statpartpricehistory
  try {
    const rel = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a => /statpartpricehistory\.aspx/i.test((a as HTMLAnchorElement).href || (a.getAttribute('href')||''))) as HTMLAnchorElement | undefined
      const href = link?.getAttribute('href') || link?.href || ''
      if (!href) return null
      return href.replace(/&amp;/g, '&')
    })
    if (rel) {
      const statsUrl = rel.startsWith('http') ? rel : `${ZZAP_BASE}${rel}`
      const p2 = await page.browser().newPage()
      p2.setDefaultNavigationTimeout(ZZAP_TIMEOUT_MS)
      await p2.goto(statsUrl, { waitUntil: 'domcontentloaded' })
      return p2
    }
  } catch {}
  return page
}

async function scrapeMonthlyCounts(statsPage: Page): Promise<{ label: string; count: number }[]> {
  try {
    // Try read Highcharts data if present
    const data = await statsPage.evaluate(() => {
      const res: { label: string; count: number }[] = []
      const w = window as any
      const charts = (w.Highcharts?.charts || []).filter((c: any) => c && c.series && c.xAxis)
      for (const ch of charts) {
        try {
          const cats: string[] = ch.xAxis?.[0]?.categories || []
          const series = ch.series?.[0]?.data || []
          if (cats?.length && series?.length) {
            for (let i = 0; i < Math.min(cats.length, series.length); i++) {
              const y = typeof series[i] === 'number' ? series[i] : (series[i]?.y ?? 0)
              res.push({ label: String(cats[i]), count: Number(y) || 0 })
            }
            break
          }
        } catch {}
      }
      // Fallback: scan tables
      if (!res.length) {
        const rows = Array.from(document.querySelectorAll('table tr'))
        for (const tr of rows) {
          const tds = Array.from(tr.querySelectorAll('td')).map(td => (td.textContent||'').trim())
          if (tds.length >= 2 && /\d{4}|янв|фев|мар|апр|ма[йя]|июн|июл|авг|сен|окт|ноя|дек/i.test(tds[0])) {
            const n = parseInt(tds[1].replace(/[^0-9]/g, ''), 10)
            if (!isNaN(n)) res.push({ label: tds[0], count: n })
          }
        }
      }
      return res
    })
    return data || []
  } catch { return [] }
}

function* eachMonth(from: Date, to: Date): Generator<Date> {
  const d = new Date(from.getFullYear(), from.getMonth(), 1)
  while (d <= to) {
    yield new Date(d)
    d.setMonth(d.getMonth() + 1)
  }
}

const ruGenitive = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
function labelFor(d: Date) { return `${ruGenitive[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}` }

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  const batchSize = Math.max(1, Math.min(10, Number(searchParams.get('batch') || 5)))
  if (!id) return new Response(JSON.stringify({ ok: false, error: 'id required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const job = await prisma.zzapReportJob.findUnique({ where: { id } })
  if (!job) return new Response(JSON.stringify({ ok: false, error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } })
  if (job.status === 'done') return new Response(JSON.stringify({ ok: true, status: 'done', processed: job.processed, total: job.total, resultFile: job.resultFile }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })

  const rows = (job.inputRows as any[]) as { article: string; brand: string }[]
  const processed = job.processed
  const toProcess = rows.slice(processed, processed + batchSize)
  let results = (job.results as any[]) || []
  if (results.length !== rows.length) results = Array.from({ length: rows.length })

  await prisma.zzapReportJob.update({ where: { id }, data: { status: 'running' } })

  let page: Page | null = null
  try {
    page = await loginAndGetPage()
    for (let idx = 0; idx < toProcess.length; idx++) {
      const realIndex = processed + idx
      const { article, brand } = toProcess[idx]
      try {
        await openSearch(page, article)
        const prices = await scrapeTop3Prices(page, brand)
        // open stats and get monthly counts
        const statsPage = await openStats(page)
        const monthly = await scrapeMonthlyCounts(statsPage)
        if (statsPage !== page) await statsPage.close().catch(()=>{})

        // project into map yyyy-mm -> count (try to parse label)
        const counts = new Map<string, number>()
        for (const r of monthly) {
          const m = r.label.match(/(\d{1,2})[./\- ]?(?:|\s+)?([а-яА-Яa-zA-Z]+)?[./\- ]?(\d{2,4})?/)
          // fallback store by label
          counts.set(r.label, r.count)
        }

        results[realIndex] = { article, brand, prices, stats: Object.fromEntries(Array.from(counts.entries())) }
      } catch (e: any) {
        results[realIndex] = { article, brand, error: String(e?.message || e), prices: [], stats: {} }
      }
      await prisma.zzapReportJob.update({ where: { id }, data: { processed: realIndex + 1, results } })
    }

    // If finished, build XLSX and upload
    const done = processed + toProcess.length >= rows.length
    if (done) {
      // build headers
      const from = new Date(job.periodFrom)
      const to = new Date(job.periodTo)
      const monthLabels: string[] = []
      for (const dt of eachMonth(from, to)) monthLabels.push(labelFor(dt))
      const header = ['Артикул', 'Бренд', 'Цена 1', 'Цена 2', 'Цена 3', ...monthLabels]
      const aoa: any[][] = [header]
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
      XLSX.utils.book_append_sheet(wb, ws, 'Отчёт')
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
      const key = `reports/zzap/${id}.xlsx`
      const url = await uploadBuffer(buf, key, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').catch(() => null)
      await prisma.zzapReportJob.update({ where: { id }, data: { status: 'done', resultFile: url || key, results } })
      return new Response(JSON.stringify({ ok: true, status: 'done', processed: rows.length, total: rows.length, resultFile: url || key }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    } else {
      return new Response(JSON.stringify({ ok: true, status: 'running', processed: processed + toProcess.length, total: rows.length }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch (e: any) {
    await prisma.zzapReportJob.update({ where: { id }, data: { status: 'error', error: String(e?.message || e) } })
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  } finally {
    try { await (await (page?.browser?.() as any))?.close?.() } catch {}
  }
}

