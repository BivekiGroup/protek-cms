import type { NextRequest } from 'next/server'
import puppeteer, { Page } from 'puppeteer'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ZZAP_BASE = process.env.ZZAP_BASE || 'https://www.zzap.ru'
const ZZAP_TIMEOUT_MS = Number(process.env.ZZAP_TIMEOUT_MS || 30000)
const COOKIE_FILE = process.env.ZZAP_COOKIE_FILE || path.join(process.cwd(), '.zzap-session.json')
const COOKIE_TTL_MIN = Number(process.env.ZZAP_SESSION_TTL_MINUTES || 180)

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

async function restoreSession(page: Page) {
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
    const payload = { cookies, savedAt: Date.now() }
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(payload))
  } catch {}
}

async function setInputValue(page: Page, selector: string, value: string) {
  const exists = await page.$(selector)
  if (!exists) return false
  try {
    await page.evaluate((sel, val) => {
      const el = document.querySelector(sel) as HTMLInputElement | null
      if (!el) return
      el.focus(); el.value = val
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      el.blur()
    }, selector, value)
    return true
  } catch {
    try { await page.click(selector, { clickCount: 3 }); await page.type(selector, value, { delay: 20 }); return true } catch { return false }
  }
}

async function ensureLoggedIn(page: Page, email: string, password: string) {
  // Try restore cookies and verify
  await restoreSession(page)
  try {
    await page.goto(ZZAP_BASE, { waitUntil: 'domcontentloaded', timeout: Math.min(20000, ZZAP_TIMEOUT_MS) })
    const isLogged = await page.evaluate(() => !!document.querySelector('#ctl00_lnkLogout') || Array.from(document.querySelectorAll('a')).some(a => /выход|logout|logoff/i.test((a.textContent||'').trim())))
    if (isLogged) return true
  } catch {}

  // Explicit login
  try {
    await page.goto(`${ZZAP_BASE}/user/logon.aspx`, { waitUntil: 'domcontentloaded', timeout: Math.min(20000, ZZAP_TIMEOUT_MS) })
  } catch {}

  const emailSel = [
    '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_AddrEmail1TextBox_I',
    'input[id$="AddrEmail1TextBox_I"]',
    'input[name="ctl00$BodyPlace$LogonFormCallbackPanel$LogonFormLayout$AddrEmail1TextBox"]',
    'input[type="email"]',
    'input[name*="email" i]',
  ]
  const passSel = [
    '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_PasswordTextBox_I',
    'input[id$="PasswordTextBox_I"]',
    'input[name="ctl00$BodyPlace$LogonFormCallbackPanel$LogonFormLayout$PasswordTextBox"]',
    'input[type="password"]',
  ]
  let emailUsed: string | null = null
  for (const sel of emailSel) { if (await setInputValue(page, sel, email)) { emailUsed = sel; break } }
  let passUsed: string | null = null
  for (const sel of passSel) { if (await setInputValue(page, sel, password)) { passUsed = sel; break } }

  if (emailUsed && passUsed) {
    const submitSel = ['button[type="submit" i]', 'input[type="submit" i]']
    for (const sel of submitSel) {
      const el = await page.$(sel); if (!el) continue
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: Math.min(20000, ZZAP_TIMEOUT_MS) }).catch(() => {}),
        (async () => { await el.click().catch(() => {}); await sleep(1200) })(),
      ])
      break
    }
    try {
      const logged = await page.evaluate(() => !!document.querySelector('#ctl00_lnkLogout') || Array.from(document.querySelectorAll('a')).some(a => /выход|logout|logoff/i.test((a.textContent||'').trim())))
      if (logged) await saveSession(page)
      return logged
    } catch {}
  }
  return false
}

async function scrapeOffersHTML(page: Page, article: string, brandParam?: string | null) {
  // Prefer direct hash URL first (often yields offers table for the exact brand + partnumber)
  const baseUrl = brandParam
    ? `${ZZAP_BASE}/public/search.aspx#rawdata=${encodeURIComponent(article)}&class_man=${encodeURIComponent(brandParam)}&partnumber=${encodeURIComponent(article)}`
    : `${ZZAP_BASE}/public/search.aspx#rawdata=${encodeURIComponent(article)}`
  try { await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: Math.min(20000, ZZAP_TIMEOUT_MS) }) } catch {}
  // Give client-side UI a moment (DevExpress)
  await sleep(1200)
  // If there is a search input present, press Enter to trigger results
  try {
    const hasInput = await page.$('input[type="search"], input[name*="search" i]')
    if (hasInput) {
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: Math.min(12000, ZZAP_TIMEOUT_MS) }).catch(() => {}),
        (async () => { try { await page.keyboard.press('Enter') } catch {} ; await sleep(1000) })(),
      ])
    }
  } catch {}
  // Small wait for offers to render
  await sleep(1000)
  const html = await page.content()
  // Also capture plain text to help the model if needed
  const text = await page.evaluate(() => document.body?.innerText || '')
  return { html, text, url: page.url() }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const article = (searchParams.get('article') || '').trim()
  const brand = (searchParams.get('brand') || '').trim() || null
  const debug = searchParams.get('debug') === '1'
  if (!article) return new Response(JSON.stringify({ error: 'Не передан артикул ?article=' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })

  const email = process.env.ZZAP_EMAIL
  const password = process.env.ZZAP_PASSWORD
  if (!email || !password) return new Response(JSON.stringify({ error: 'Отсутствуют ZZAP_EMAIL/ZZAP_PASSWORD в .env' }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })

  let browser: puppeteer.Browser | null = null
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' })
    try { page.setDefaultNavigationTimeout?.(ZZAP_TIMEOUT_MS); page.setDefaultTimeout?.(ZZAP_TIMEOUT_MS) } catch {}

    await ensureLoggedIn(page, email, password)

    const { html, text, url } = await scrapeOffersHTML(page, article, brand)

    // Truncate overly long HTML to keep token usage sane
    const maxLen = 200_000
    const htmlTrimmed = html.length > maxLen ? html.slice(0, maxLen) : html
    const textTrimmed = text.length > maxLen ? text.slice(0, maxLen) : text

    // Compose extraction prompt (strict rules to avoid picking min-order values like "Заказ от 3 000р." instead of unit price)
    const system = [
      'You extract prices of the first 3 sale offers from noisy Russian ecommerce HTML.',
      'STRICT RULES:',
      '- Return UNIT price per item only. Ignore minimum order amounts, ranges, or totals.',
      '- EXCLUDE any number near phrases like: "Заказ от", "Мин. заказ", "Минимальный заказ", "от ", "≈", "~", "%", "предоплата", "доставка", "кредит", "скидка".',
      '- Prefer numbers that are clearly labeled as price (next to currency: ", ₽, р., руб, BYN, KZT, USD, EUR) or in a table column named "Цена".',
      '- Never concatenate multiple numbers. Choose a single number as the price. If a line has multiple numbers (e.g., "Заказ от 3 000р. 9 272р."), pick the explicit price ("9 272р.") and ignore the min-order ("3 000р.").',
      '- For RUB/₽/р./руб values, price is typically an integer; if decimals appear, round to nearest integer.',
      '- If fewer than 3 offers are detectable, return only the ones you are confident about. Do not invent.',
      '- Do NOT drop an offer just because it mentions min-order (e.g., "Заказ от 3 000р."); still return the unit price for that offer.',
      'Respond strictly in JSON only: { "offers": [{"price": number, "currency": string, "raw": string}] } .',
      'Use raw as a short excerpt (<=120 chars) showing the source snippet you used for that price.',
    ].join(' ')
    const userMsg = `Article: ${article}${brand ? `\nBrand: ${brand}` : ''}\nURL: ${url}\n--- TEXT ---\n${textTrimmed}\n--- HTML ---\n${htmlTrimmed}`

    // Send to our AI proxy (non-streaming for easy parsing)
    const aiRes = await fetch(new URL('/api/ai/chat', req.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        stream: false,
        // Prefer ZZAP_VISION_MODEL if provided, else default POLZA model configured server-side
        model: process.env.ZZAP_VISION_MODEL || undefined,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg }
        ]
      })
    })

    const aiText = await aiRes.text()
    let parsed: any = null
    try { parsed = JSON.parse(aiText) } catch {}
    let offers = Array.isArray(parsed?.offers) ? parsed.offers : []

    // Helper: pick a likely unit price from a raw snippet, avoiding min-order phrases
    const pickPriceFromRaw = (rawIn: string, curIn?: string) => {
      if (!rawIn) return null as null | { price: number; currency?: string }
      const raw = rawIn.replace(/\u00A0/g, ' ')
      const CURRENCY = '(₽|р\\.?|руб\\.?|BYN|KZT|USD|EUR)'
      const re = new RegExp(`(\\d{1,3}(?:[ .]\\d{3})*(?:[.,]\\d+)?)[\\s]*${CURRENCY}`, 'gi')
      const badNear = /(от|заказ|мин\.?\s*заказ|минимал\w*\s*заказ)/i
      let match: RegExpExecArray | null
      const candidates: Array<{ num: number; currency: string; idx: number; score: number }> = []
      while ((match = re.exec(raw))) {
        const numRaw = match[1]
        const cur = match[2]
        const idx = match.index
        let numStr = numRaw.replace(/\s|\./g, '')
        // If comma used as decimal, convert
        numStr = numStr.replace(/,(\d+)/, '.$1')
        const num = Number(numStr)
        if (!isFinite(num) || num <= 0) continue
        // Score: penalize if near bad words in preceding 8 chars, reward if near "цена"
        const pre = raw.slice(Math.max(0, idx - 20), idx).toLowerCase()
        const post = raw.slice(idx, Math.min(raw.length, idx + 20)).toLowerCase()
        let score = 1
        if (badNear.test(pre) || badNear.test(post)) score -= 2
        if (/цена/.test(pre) || /цена/.test(post)) score += 2
        candidates.push({ num, currency: cur, idx, score })
      }
      if (candidates.length === 0) return null
      // Prefer highest score; tie-breaker: later occurrence (often the actual price follows min-order)
      candidates.sort((a, b) => (b.score - a.score) || (b.idx - a.idx))
      const best = candidates[0]
      return { price: best.num, currency: best.currency || curIn }
    }

    // Normalize, fix prices from raw if needed, keep offers even if raw mentions min-order
    offers = offers
      .filter((o: any) => o && (typeof o.price === 'number' || typeof o.raw === 'string'))
      .map((o: any) => {
        let currency = typeof o.currency === 'string' ? o.currency : ''
        let price = typeof o.price === 'number' && isFinite(o.price) ? Number(o.price) : NaN
        const raw = (o.raw || '').toString()
        // Try to correct/derive from raw when ambiguous
        const picked = pickPriceFromRaw(raw, currency)
        if (picked && (!isFinite(price) || price <= 0 || Math.abs(picked.price - price) > 0.001)) {
          price = picked.price
          if (picked.currency && !currency) currency = picked.currency
        }
        if (/(₽|\bруб\.?|\bр\.?)/i.test(currency)) price = Math.round(price)
        return { price, currency, raw }
      })
      .filter((o: any) => isFinite(o.price) && o.price > 0 && o.price < 1e7)
      .slice(0, 3)

    return new Response(JSON.stringify({ ok: true, url, offers, raw: debug ? { aiText } : undefined }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  } finally {
    try { await browser?.close() } catch {}
  }
}
