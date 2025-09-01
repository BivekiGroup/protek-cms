import type { NextRequest } from 'next/server'
import puppeteer, { Page } from 'puppeteer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Reuse the same envs as screenshot route
const ZZAP_BASE = process.env.ZZAP_BASE || 'https://www.zzap.ru'
const ZZAP_TIMEOUT_MS = Number(process.env.ZZAP_TIMEOUT_MS || 30000)

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

// Parse raw text returned by statpartpricehistory into array of points {year, month, value}
function parseChartData(raw: string): { year: number; month: number; value: number }[] {
  const out: { year: number; month: number; value: number }[] = []
  const months: Record<string, number> = {
    'янв': 1, 'фев': 2, 'мар': 3, 'апр': 4, 'май': 5, 'мая': 5, 'июн': 6, 'июл': 7, 'авг': 8, 'сен': 9, 'сент': 9, 'окт': 10, 'ноя': 11, 'дек': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'sept': 9, 'oct': 10, 'nov': 11, 'dec': 12
  }

  const tryPush = (label: string, v: any) => {
    const value = Number(v)
    if (!Number.isFinite(value)) return
    const s = label.toString().trim().toLowerCase()
    // Common label forms: "янв-24", "января-24", "янв 2024", "08.2024"
    // 1) DD.MM.YYYY or MM.YYYY or MM-YYYY
    let m = s.match(/\b(\d{1,2})[./-](\d{2,4})\b/)
    if (m) {
      const mm = parseInt(m[1], 10)
      const yy = parseInt(m[2], 10)
      const year = yy < 100 ? 2000 + yy : yy
      if (mm >= 1 && mm <= 12) out.push({ year, month: mm, value }); return
    }
    // 2) <month name>-YY or <month name>-YYYY
    m = s.match(/([а-яa-z]+)/i)
    if (m) {
      const key = (m[1] || '').slice(0, 4).replace(/[^а-яa-z]/gi, '').toLowerCase()
      const mm = months[key]
      const yearM = s.match(/(20\d{2}|\d{2})/)
      const yy = yearM ? parseInt(yearM[1], 10) : NaN
      const year = Number.isFinite(yy) ? (yy < 100 ? 2000 + yy : yy) : NaN
      if (mm && Number.isFinite(year)) { out.push({ year, month: mm, value }); return }
    }
    // 3) Fallback: if label is just year-month numeric packed
    m = s.match(/\b(20\d{2})(\d{2})\b/)
    if (m) {
      const year = parseInt(m[1], 10)
      const month = parseInt(m[2], 10)
      if (month >= 1 && month <= 12) out.push({ year, month, value })
    }
  }

  const tryJSON = (txt: string) => {
    try {
      const j = JSON.parse(txt)
      // 1) { categories: [], series: [{name, data: []}] }
      if (j && typeof j === 'object') {
        const categories = (j.categories || j.Categories || j.xAxis?.categories) as any[] | undefined
        const series = (j.series || j.Series) as any[] | undefined
        if (Array.isArray(categories) && Array.isArray(series) && series.length) {
          // Prefer a series named like "запрос"
          let s = series.find((x: any) => /запрос|поиск|просмотр/i.test(String(x?.name || ''))) || series[0]
          const data = Array.isArray(s?.data) ? s.data : []
          for (let i = 0; i < Math.min(categories.length, data.length); i++) tryPush(String(categories[i]), data[i])
          return true
        }
        // 2) Array of objects [{label, value}] or [{year, month, value}]
        if (Array.isArray(j)) {
          for (const it of j) {
            if (it && typeof it === 'object') {
              if (typeof it.year === 'number' && typeof it.month === 'number') {
                const val = Number((it as any).value ?? (it as any).count ?? (it as any).y)
                if (Number.isFinite(val)) out.push({ year: it.year, month: it.month, value: val })
              } else if (typeof (it as any).label === 'string') {
                const val = Number((it as any).value ?? (it as any).count ?? (it as any).y)
                tryPush((it as any).label, val)
              }
            }
          }
          return out.length > 0
        }
      }
    } catch {}
    return false
  }

  // Try as pure JSON first
  if (tryJSON(raw)) return out

  // Try to extract JSON from JS/HTML
  const jsonLike = raw.match(/[\[{][\s\S]*[\]}]/)
  if (jsonLike) {
    if (tryJSON(jsonLike[0])) return out
  }

  // Try Highcharts config parsing: categories: [...], series: [{ data: [...] }]
  try {
    const catsM = raw.match(/categories\s*:\s*\[(.*?)\]/is)
    const dataM = raw.match(/series\s*:\s*\[\s*\{[\s\S]*?data\s*:\s*\[(.*?)\]/is)
    if (catsM && dataM) {
      const cats = catsM[1].split(',').map(s => s.replace(/["'`]/g, '').trim())
      const vals = dataM[1].split(',').map(s => Number(s.replace(/[^0-9.-]/g, '')))
      for (let i = 0; i < Math.min(cats.length, vals.length); i++) tryPush(cats[i], vals[i])
    }
  } catch {}

  return out
}

async function loginIfNeeded(page: Page, email: string, password: string) {
  try {
    await page.goto(ZZAP_BASE, { waitUntil: 'domcontentloaded', timeout: Math.min(20000, ZZAP_TIMEOUT_MS) })
    const logged = await page.evaluate(() => {
      const byId = !!document.querySelector('#ctl00_lnkLogout')
      const byText = Array.from(document.querySelectorAll('a')).some(a => /выход|выйти|logout/i.test((a.textContent || '').trim()))
      return byId || byText
    })
    if (logged) return
  } catch {}
  await page.goto(`${ZZAP_BASE}/user/logon.aspx`, { waitUntil: 'domcontentloaded', timeout: Math.min(20000, ZZAP_TIMEOUT_MS) })
  const emailSel = '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_AddrEmail1TextBox_I, input[type="email"]'
  const passSel = '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_PasswordTextBox_I, input[type="password"]'
  try { await page.type(emailSel, email, { delay: 20 }) } catch {}
  try { await page.type(passSel, password, { delay: 20 }) } catch {}
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: Math.min(15000, ZZAP_TIMEOUT_MS) }).catch(() => {}),
    (async () => { try { await page.keyboard.press('Enter') } catch {}; await sleep(1200) })()
  ])
}

async function openSearch(page: Page, article: string, brand?: string | null) {
  const base = `${ZZAP_BASE}/public/search.aspx#rawdata=${encodeURIComponent(article)}`
  const url = brand ? `${base}&class_man=${encodeURIComponent(brand)}&partnumber=${encodeURIComponent(article)}` : base
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.min(20000, ZZAP_TIMEOUT_MS) }).catch(() => {})
}

async function ensureStatsOpen(page: Page): Promise<Page> {
  // If already on stats page
  if (/\/user\/statpartpricehistory\.aspx/i.test(page.url())) return page
  // Try click link with href containing statpartpricehistory
  try {
    const rel = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a'))
        .find(a => /statpartpricehistory\.aspx/i.test((a as HTMLAnchorElement).href || (a.getAttribute('href') || '')))
      const href = (link as HTMLAnchorElement | undefined)?.getAttribute('href') || (link as HTMLAnchorElement | undefined)?.href || ''
      return href ? href.replace(/&amp;/g, '&') : null
    })
    if (rel) {
      const url = rel.startsWith('http') ? rel : `${ZZAP_BASE}${rel}`
      const p2 = await page.browser().newPage()
      await p2.setViewport({ width: 1440, height: 900 })
      await p2.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
      await p2.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' })
      const cookies = await page.cookies()
      if (cookies?.length) await p2.setCookie(...cookies)
      await p2.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.min(20000, ZZAP_TIMEOUT_MS) })
      return p2
    }
  } catch {}
  return page
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const article = searchParams.get('article')?.trim()
  const brand = searchParams.get('brand')?.trim() || undefined
  const debug = searchParams.get('debug') === '1'
  if (!article) return new Response(JSON.stringify({ ok: false, error: 'article required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })

  const email = process.env.ZZAP_EMAIL
  const password = process.env.ZZAP_PASSWORD
  if (!email || !password) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing ZZAP_EMAIL/ZZAP_PASSWORD' }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }

  const logs: string[] = []
  const log = (m: string) => { try { logs.push(m) } catch {} }
  let postRequests: Array<{ url: string; method: string; headers: Record<string, string>; body: string; timestamp: number; status?: number }> = []

  let browser = null as puppeteer.Browser | null
  try { browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] }); log('puppeteer: launched') } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e), reason: 'puppeteer_launch_failed', logs, postRequests }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
  await page.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' })
  page.setDefaultNavigationTimeout(ZZAP_TIMEOUT_MS)
  page.setDefaultTimeout(ZZAP_TIMEOUT_MS)

  let statsPage: Page | null = null
  const candidates: { url: string; body: string; contentType: string | null }[] = []
  const observedAll: { url: string; len: number; contentType: string | null; variant: 'image' | 'data' | 'unknown' }[] = []
  const observedNet: Array<{ url: string; method?: string; status?: number; type?: string; ct?: string | null; len?: number }> = []

  try {
    log('login: start')
    await loginIfNeeded(page, email, password)
    log('login: done')
    await openSearch(page, article, brand)
    log(`search: opened for article=${article}${brand ? `, brand=${brand}` : ''}`)
    // open stats page in same or new tab
    statsPage = await ensureStatsOpen(page)
    log(`stats: page url=${statsPage?.url?.() || page.url()}`)

    // Listen for responses on the page where stats is loaded
    const targetPage = statsPage || page
    const isWanted = (rawUrl: string) => {
      const url = rawUrl || ''
      if (!/\/user\/statpartpricehistory\.aspx/i.test(url)) return false
      if (/[?&](DXCache|DXRefresh)=/i.test(url)) return false // image/chart refresh
      try {
        const u = new URL(url, ZZAP_BASE)
        const hasCat = u.searchParams.has('code_cat')
        const hasHash = u.searchParams.has('params_hash')
        return hasCat && hasHash
      } catch { return true }
    }

    // For broad debugging, capture all ZZAP responses metadata
    let baseHost = 'zzap.ru'
    try { baseHost = new URL(ZZAP_BASE).hostname || 'zzap.ru' } catch {}

    const onRequest = async (req: any) => {
      try {
        const url = req.url?.() || req.url || ''
        const method = req.method?.() || req.method || ''
        if (!url || method !== 'POST') return
        
        // Логируем все POST запросы
        try {
          const h = new URL(url, ZZAP_BASE).hostname
          if (h && h.includes(baseHost)) {
            const headers = (typeof req.headers === 'function' ? req.headers() : (req.headers || {})) as Record<string, string>
            let body = ''
            try {
              const postData = req.postData?.() || req.postData
              body = postData || ''
            } catch {}
            
            postRequests.push({
              url,
              method,
              headers,
              body,
              timestamp: Date.now()
            })
            log(`POST REQUEST: ${method} ${url} (body: ${body.length} bytes)`)
          }
        } catch {}
      } catch {}
    }

    const onResponse = async (resp: any) => {
      try {
        const url = resp.url?.() || resp.url || ''
        if (url) {
          // Обновляем статус ответа для POST запросов
          const req = resp.request?.() || resp.request
          const method = req?.method?.() || req?.method || ''
          if (method === 'POST') {
            const matchingPost = postRequests.find(p => p.url === url && !p.status)
            if (matchingPost) {
              matchingPost.status = (typeof resp.status === 'function' ? resp.status() : resp.status) || 0
            }
          }

          try {
            const req: any = resp.request?.() || resp.request || null
            const method: string | undefined = req?.method?.() || req?.method || undefined
            const type: string | undefined = req?.resourceType?.() || req?.resourceType || undefined
            const status: number | undefined = (typeof resp.status === 'function' ? resp.status() : resp.status) || undefined
            const headers = (typeof resp.headers === 'function' ? resp.headers() : (resp.headers || {})) as Record<string, string>
            const ct = (headers['content-type'] || headers['Content-Type'] || '') || null
            const len = Number(headers['content-length'] || headers['Content-Length'] || 0) || 0
            // Only include ZZAP host to reduce noise
            try {
              const h = new URL(url, ZZAP_BASE).hostname
              if (h && h.includes(baseHost)) {
                observedNet.push({ url, method, status, type, ct, len })
              }
            } catch {}
          } catch {}
        }
        if (!url) return
        const ct = (resp.headers?.()['content-type'] || resp.headers?.get?.('content-type') || '') as string
        // Record all statpartpricehistory calls for diagnostics
        if (/\/user\/statpartpricehistory\.aspx/i.test(url)) {
          const isImg = /[?&](DXCache|DXRefresh)=/i.test(url) || /image\//i.test(ct)
          observedAll.push({ url, len: Number(resp.headers?.()['content-length'] || 0) || 0, contentType: ct || null, variant: isImg ? 'image' : 'data' })
        }
        // Only parse the wanted ones
        if (!isWanted(url)) return
        let body = ''
        try { body = await resp.text() } catch {}
        if (!body || body.length < 5) {
          try { const buf = await resp.buffer(); body = buf?.toString('utf8') || '' } catch {}
        }
        if (body) candidates.push({ url, body, contentType: ct || null })
      } catch {}
    }
    targetPage.on('request', onRequest)
    targetPage.on('response', onResponse)
    if (targetPage !== page) {
      page.on('request', onRequest)
      page.on('response', onResponse)
    }
    log('listen: response handler attached')

    // Nudge the page a bit so charts/data load
    try { await targetPage.waitForSelector('.highcharts-container, svg, canvas', { timeout: 6000 }); log('ui: chart container detected') } catch { log('ui: chart container not detected (timeout)') }
    await sleep(800)

    // Wait until we get at least one candidate or timeout
    const startedAt = Date.now()
    while (Date.now() - startedAt < 15000) {
      if (candidates.length >= 1) break
      await sleep(300)
    }

    log(`network: statpartpricehistory candidates=${candidates.length}`)
    // Sometimes there are 2 preliminary calls; wait a tiny bit longer to capture the next one
    if (candidates.length === 1) { await sleep(1000); log('network: waited for potential 2nd/3rd call (1)') }
    if (candidates.length === 2) { await sleep(1000); log('network: waited for potential 3rd call (2)') }

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ ok: true, points: [], url: null, reason: 'no_api_call_found', logs, observed: observedAll, observedNet, postRequests }), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
      })
    }

    // Pick best candidate: prefer JSON-like body and longer length
    const pick = candidates
      .map((c, idx) => ({ c, idx, score: (/json|javascript/i.test(c.contentType || '') ? 10 : 0) + (/[\[{]/.test(c.body) ? 5 : 0) + Math.min(5, Math.floor((c.body.length || 0) / 1000)) }))
      .sort((a, b) => (b.score - a.score) || (b.idx - a.idx))[0]?.c

    const chosen = pick || candidates[0]
    const parsed = chosen ? parseChartData(chosen.body) : []
    log(`parse: chosen url=${chosen?.url || 'n/a'}, points=${parsed.length}`)

    if (debug) {
      return new Response(JSON.stringify({ ok: true, url: chosen?.url || null, count: parsed.length, points: parsed, observed: observedAll, observedNet, logs, postRequests }), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      })
    }

    const reason = parsed.length === 0 ? 'parsed_zero' : undefined
    return new Response(JSON.stringify({ ok: true, points: parsed, url: chosen?.url || null, reason, logs, observed: observedAll, observedNet, postRequests }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    })
  } catch (e: any) {
    logs.push(`error: ${e?.message || String(e)}`)
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e), reason: 'exception', logs, observed: observedAll, observedNet, postRequests }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  } finally {
    try { await (statsPage || page).browser().close() } catch {}
  }
}
