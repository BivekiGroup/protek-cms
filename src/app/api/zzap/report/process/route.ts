import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import puppeteer, { Page } from 'puppeteer'
import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import { uploadBuffer } from '@/lib/s3'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ZZAP_BASE = process.env.ZZAP_BASE || 'https://www.zzap.ru'
const ZZAP_TIMEOUT_MS = Number(process.env.ZZAP_TIMEOUT_MS || 30000)
const COOKIE_FILE = process.env.ZZAP_COOKIE_FILE || path.join(process.cwd(), '.zzap-session.json')
const COOKIE_TTL_MIN = Number(process.env.ZZAP_SESSION_TTL_MINUTES || 180)

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function normalizePrice(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, '').replace(/\s+/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

async function restoreSession(page: Page): Promise<boolean> {
  try {
    if (!fs.existsSync(COOKIE_FILE)) return false
    const raw = fs.readFileSync(COOKIE_FILE, 'utf-8')
    const data = JSON.parse(raw) as { cookies: any[]; savedAt: number }
    if (!data?.cookies?.length || !data?.savedAt) return false
    const ageMin = (Date.now() - data.savedAt) / 60000
    if (ageMin > COOKIE_TTL_MIN) return false
    await page.setCookie(...data.cookies)
    return true
  } catch { return false }
}

async function saveSession(page: Page) {
  try {
    const cookies = await page.cookies()
    fs.writeFileSync(COOKIE_FILE, JSON.stringify({ cookies, savedAt: Date.now() }))
  } catch {}
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
  try { await page.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' }) } catch {}
  // Try restore session first
  await restoreSession(page)
  try {
    await page.goto(ZZAP_BASE, { waitUntil: 'domcontentloaded' })
    const logged = await page.evaluate(() => {
      const byId = !!document.querySelector('#ctl00_lnkLogout')
      const byText = Array.from(document.querySelectorAll('a')).some(a => /выход|logout|logoff/i.test((a.textContent||'').trim()))
      return byId || byText
    })
    if (logged) return page
  } catch {}
  // Explicit login
  await page.goto(`${ZZAP_BASE}/user/logon.aspx`, { waitUntil: 'domcontentloaded' })
  const emailSel = '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_AddrEmail1TextBox_I, input[type="email"]'
  const passSel = '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_PasswordTextBox_I, input[type="password"]'
  await page.type(emailSel, email).catch(()=>{})
  await page.type(passSel, password).catch(()=>{})
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(()=>{}),
    page.keyboard.press('Enter'),
  ])
  await saveSession(page)
  return page
}

async function openSearch(page: Page, article: string, brand?: string) {
  const urls = [
    `${ZZAP_BASE}/public/search.aspx#rawdata=${encodeURIComponent(article)}${brand ? `&class_man=${encodeURIComponent(brand)}&partnumber=${encodeURIComponent(article)}` : ''}`,
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

async function scrapeTop3Prices(page: Page, brand: string, article?: string): Promise<number[]> {
  try {
    // Целенаправленно по ZZAP Grid: берём первые 3 строки и читаем <td class="pricewhitecell"> -> span.f14b
    const prices = await page.evaluate((brandUpper: string, art?: string) => {
      const out: number[] = []
      const rows = Array.from(document.querySelectorAll('tr[id*="SearchGridView_DXDataRow"]')) as HTMLTableRowElement[]
      for (const tr of rows) {
        const tds = tr.querySelectorAll('td')
        const brandCell = tds?.[2]
        const brandText = (brandCell?.innerText || '').trim().toUpperCase()
        if (brandUpper && !brandText.includes(brandUpper)) continue
        if (art) {
          const artText = (tr.querySelector('.f-sel')?.textContent || '').trim().toUpperCase()
          if (artText && artText !== art.toUpperCase()) continue
        }
        const priceSpan = tr.querySelector('td.pricewhitecell span.f14b, td[align="right" i] span.f14b, .pricewhitecell .f14b, .f14b') as HTMLElement | null
        const raw = (priceSpan?.innerText || '').trim()
        const m = raw.match(/\d[\d\s.,]*/)
        if (m) {
          const cleaned = m[0].replace(/[^0-9.,]/g, '').replace(/\s+/g, '').replace(',', '.')
          const n = parseFloat(cleaned)
          if (Number.isFinite(n)) out.push(n)
        }
        if (out.length >= 3) break
      }
      return out.slice(0, 3)
    }, brand.toUpperCase(), article)
    return prices || []
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

async function scrapeMonthlyCounts(statsPage: Page, monthLabels: string[]): Promise<{ label: string; count: number }[]> {
  try {
    // 1) Попытка прочитать данные напрямую из Highcharts
    const data = await statsPage.evaluate((wanted: string[]) => {
      const res: { label: string; count: number }[] = []
      const w = window as any
      const charts = (w.Highcharts?.charts || []).filter((c: any) => c && c.series && c.xAxis)
      const rxReq = /запрос|поиск|просмотр/i
      for (const ch of charts) {
        try {
          const cats: string[] = ch.xAxis?.[0]?.categories || []
          if (!cats?.length) continue
          // выбрать серию, похожую на "запросы"
          let targetSeries: any = null
          for (const s of ch.series || []) {
            const n = (s?.name || '').toString()
            if (rxReq.test(n)) { targetSeries = s; break }
          }
          if (!targetSeries && ch.series?.length === 1) targetSeries = ch.series[0]
          const series = targetSeries?.data || []
          if (series?.length) {
            for (let i = 0; i < Math.min(cats.length, series.length); i++) {
              const y = typeof series[i] === 'number' ? series[i] : (series[i]?.y ?? 0)
              const label = String(cats[i])
              res.push({ label, count: Number(y) || 0 })
            }
            // не прерываем, но приоритет у первой подходящей
            break
          }
        } catch {}
      }
      if (res.length) return res
      return []
    }, monthLabels)
    if (data?.length) return data

    // 2) Фолбэк: по таблице
    const table = await statsPage.evaluate(() => {
      const out: { label: string; count: number }[] = []
      const rows = Array.from(document.querySelectorAll('table tr'))
      for (const tr of rows) {
        const tds = Array.from(tr.querySelectorAll('td')).map(td => (td.textContent||'').trim())
        if (tds.length >= 2 && /\d{4}|янв|фев|мар|апр|ма[йя]|июн|июл|авг|сен|окт|ноя|дек/i.test(tds[0])) {
          const n = parseInt(tds[1].replace(/[^0-9]/g, ''), 10)
          if (!isNaN(n)) out.push({ label: tds[0], count: n })
        }
      }
      return out
    })
    return table || []
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
  // Load job via Prisma only
  const job: any = await (prisma as any).zzapReportJob.findUnique({ where: { id } })
  if (!job) return new Response(JSON.stringify({ ok: false, error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } })
  if (job.status === 'done') return new Response(JSON.stringify({ ok: true, status: 'done', processed: job.processed, total: job.total, resultFile: job.resultFile }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
  if (job.status === 'canceled' || job.status === 'failed' || job.status === 'error') {
    return new Response(JSON.stringify({ ok: true, status: job.status, processed: job.processed, total: job.total, resultFile: job.resultFile, error: job.error }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }

  const rows = (job.inputRows as any[]) as { article: string; brand: string }[]
  const processed = job.processed
  const toProcess = rows.slice(processed, processed + batchSize)
  let results = (job.results as any[]) || []
  if (results.length !== rows.length) results = Array.from({ length: rows.length }).fill(null)

  await (prisma as any).zzapReportJob.update({ where: { id }, data: { status: 'running' } })

  // Helper to call internal endpoints (AI, screenshot)
  const origin = (() => { try { const u = new URL(req.url); return `${u.protocol}//${u.host}` } catch { return '' } })()
  const callScreenshot = async (article: string, brand?: string): Promise<string | null> => {
    try {
      const qs = new URLSearchParams({ article })
      if (brand) qs.set('brand', brand)
      qs.set('debug', '1')
      const res = await fetch(`${origin}/api/zzap/screenshot?${qs.toString()}`, { method: 'GET', headers: { 'accept': 'application/json' } })
      if (!res.ok) return null
      const j = await res.json().catch(() => null as any)
      const url = j?.imageUrl || null
      return typeof url === 'string' && url.startsWith('http') ? url : null
    } catch { return null }
  }
  const callVisionAI = async (imageUrl: string, monthLabels: string[]): Promise<{ summary: string | null; stats: Record<string, number> | null }> => {
    try {
      const modelOverride = (process.env.ZZAP_VISION_MODEL || '').trim() || undefined
      const sys = { role: 'system', content: 'Верни строго JSON без пояснений, извлекая данные из картинки.' }
      const prompt = `На изображении график статистики ZZAP. Верни строго JSON вида {"summary":"…","stats":{}}. В stats используй только эти метки: ${monthLabels.join(', ')}. Если число не видно — 0.`
      const user = { role: 'user', content: [ { type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl } } ] } as any
      const res = await fetch(`${origin}/api/ai/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept': 'text/plain' },
        body: JSON.stringify({ messages: [sys, user], stream: false, temperature: 0.1, ...(modelOverride ? { model: modelOverride } : {}) })
      })
      const text = await res.text().catch(() => '')
      if (!res.ok) return { summary: null, stats: null }
      let summary: string | null = null
      let stats: Record<string, number> | null = null
      try {
        const j = JSON.parse(text)
        if (j && typeof j === 'object') {
          summary = typeof j.summary === 'string' ? j.summary : null
          if (j.stats && typeof j.stats === 'object') {
            stats = {}
            for (const k of monthLabels) {
              const v = (j.stats as any)[k]
              const n = typeof v === 'number' ? v : Number(v)
              stats[k] = Number.isFinite(n) ? n : 0
            }
          }
        }
      } catch {}
      return { summary: summary || (text || '').trim().slice(0, 500), stats }
    } catch { return { summary: null, stats: null } }
  }

  // Подготовим список меток месяцев для нужного периода (используется как подсказка ИИ)
  const from = new Date(job.periodFrom)
  const to = new Date(job.periodTo)
  const monthLabels: string[] = []
  for (const dt of eachMonth(from, to)) monthLabels.push(labelFor(dt))

  let page: Page | null = null
  try {
    page = await loginAndGetPage()
    for (let idx = 0; idx < toProcess.length; idx++) {
      const realIndex = processed + idx
      const { article, brand } = toProcess[idx]
      try {
        await openSearch(page, article, brand)
        try { await page.waitForSelector('tr[id*="SearchGridView_DXDataRow"], table[id*="SearchGridView_DXMainTable"]', { timeout: 12000 }) } catch {}
        const prices = await scrapeTop3Prices(page, brand, article)
        // open stats, take screenshot first (as per required order), then get monthly counts
        const statsPage = await openStats(page)
        let imageUrl: string | null = null
        let aiText: string | null = null
        let aiStats: Record<string, number> | null = null
        try { imageUrl = await callScreenshot(article, brand) } catch {}
        if (imageUrl) {
          try { const ai = await callVisionAI(imageUrl, monthLabels); aiText = ai.summary; aiStats = ai.stats } catch {}
        }
        const monthly = await scrapeMonthlyCounts(statsPage, monthLabels)
        if (statsPage !== page) await statsPage.close().catch(()=>{})

        // project into map yyyy-mm -> count (try to parse label)
        const counts = new Map<string, number>()
        for (const r of monthly) {
          const m = r.label.match(/(\d{1,2})[./\- ]?(?:|\s+)?([а-яА-Яa-zA-Z]+)?[./\- ]?(\d{2,4})?/)
          // fallback store by label
          counts.set(r.label, r.count)
        }

        const mergedStats = aiStats && Object.keys(aiStats).length ? aiStats : Object.fromEntries(Array.from(counts.entries()))
        results[realIndex] = { article, brand, prices, stats: mergedStats, imageUrl, ai: aiText }
      } catch (e: any) {
        results[realIndex] = { article, brand, error: String(e?.message || e), prices: [], stats: {}, imageUrl: null, ai: null }
      }
      const safeResults = results.map((v: any) => (v === undefined ? null : v))
      await (prisma as any).zzapReportJob.update({ where: { id }, data: { processed: realIndex + 1, results: safeResults } })
      // Check cancel flag between items
      const j2 = await (prisma as any).zzapReportJob.findUnique({ where: { id }, select: { status: true, total: true } })
      const s = j2?.status
      if (s === 'canceled') {
        return new Response(JSON.stringify({ ok: true, status: 'canceled', processed: realIndex + 1, total: (j2?.total || rows.length) }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
      }
    }

    // If finished, build XLSX and upload
    const done = processed + toProcess.length >= rows.length
    if (done) {
      // build headers
      const from = new Date(job.periodFrom)
      const to = new Date(job.periodTo)
      const monthLabels: string[] = []
      for (const dt of eachMonth(from, to)) monthLabels.push(labelFor(dt))
      const title = ['Отчёт ZZAP на 30 августа']
      const header = ['Артикул', 'Бренд', 'Цена 1', 'Цена 2', 'Цена 3', ...monthLabels, 'AI']
      const aoa: any[][] = [title, header]
      for (let i = 0; i < rows.length; i++) {
        const r = results[i] || { article: rows[i].article, brand: rows[i].brand, prices: [], stats: {}, ai: null }
        const row = [r.article, r.brand]
        const p = (r.prices || []) as number[]
        row.push(p[0] ?? '', p[1] ?? '', p[2] ?? '')
        for (const ml of monthLabels) {
          const v = (r.stats && (r.stats as any)[ml]) ?? ''
          row.push(v)
        }
        row.push(r.ai || '')
        aoa.push(row)
      }
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      // Merge title across all columns
      try { (ws['!merges'] = ws['!merges'] || []).push({ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }) } catch {}
      XLSX.utils.book_append_sheet(wb, ws, 'Отчёт')
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
      const key = `reports/zzap/${id}.xlsx`
      const url = await uploadBuffer(buf, key, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').catch(() => null)
      const safeResults = results.map((v: any) => (v === undefined ? null : v))
      await (prisma as any).zzapReportJob.update({ where: { id }, data: { status: 'done', resultFile: url || key, results: safeResults } })
      return new Response(JSON.stringify({ ok: true, status: 'done', processed: rows.length, total: rows.length, resultFile: url || key }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    } else {
      return new Response(JSON.stringify({ ok: true, status: 'running', processed: processed + toProcess.length, total: rows.length }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
  } catch (e: any) {
    await (prisma as any).zzapReportJob.update({ where: { id }, data: { status: 'error', error: String(e?.message || e) } })
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  } finally {
    try { await (page?.browser()?.close?.()) } catch {}
  }
}
