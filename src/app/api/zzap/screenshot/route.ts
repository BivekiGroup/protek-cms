import type { NextRequest } from 'next/server'
import puppeteer from 'puppeteer'
import type { Page, ElementHandle } from 'puppeteer'
import { uploadBuffer } from '@/lib/s3'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ZZAP_BASE = process.env.ZZAP_BASE || 'https://www.zzap.ru'
const ZZAP_TIMEOUT_MS = Number(process.env.ZZAP_TIMEOUT_MS || 30000)
const COOKIE_FILE = process.env.ZZAP_COOKIE_FILE || path.join(process.cwd(), '.zzap-session.json')
const COOKIE_TTL_MIN = Number(process.env.ZZAP_SESSION_TTL_MINUTES || 180)

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForAnySelector(page: Page, selectors: string[], timeoutMs = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    for (const sel of selectors) {
      try { if (await page.$(sel)) return sel } catch {}
    }
    await sleep(300)
  }
  return null as string | null
}

async function setInputValue(page: Page, selector: string, value: string) {
  const exists = await page.$(selector)
  if (!exists) return false
  try {
    await page.evaluate((sel, val) => {
      const el = document.querySelector(sel) as HTMLInputElement | null
      if (!el) return
      el.focus()
      el.value = val
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      el.blur()
    }, selector, value)
    return true
  } catch {
    try {
      await page.click(selector, { clickCount: 3 })
      await page.type(selector, value, { delay: 20 })
      return true
    } catch {
      return false
    }
  }
}

async function clickByText(page: Page, text: string) {
  const handle = await page.evaluateHandle((t: string) => {
    const target = t.toLowerCase()
    const candidates = Array.from(document.querySelectorAll('button, a, input[type="submit"], span, div')) as HTMLElement[]
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || '').trim().toLowerCase()
      if (!txt) continue
      if (txt.includes(target)) return el
    }
    return null
  }, text)
  try {
    const el = (handle as any).asElement?.()
    if (el) {
      await el.click()
      return true
    }
  } catch {}
  try { await (handle as any).dispose?.() } catch {}
  return false
}

async function findLargestElementHandle(page: Page, selectors: string[]): Promise<ElementHandle<Element> | null> {
  for (const sel of selectors) {
    const handles = await page.$$(sel)
    if (handles.length) {
      let best = handles[0]
      let bestArea = 0
      for (const h of handles) {
        const box = await h.boundingBox()
        const area = box ? box.width * box.height : 0
        if (area > bestArea) {
          best = h
          bestArea = area
        }
      }
      return best
    }
  }
  return null
}

async function persistHistorySafely(
  data: { article: string; statsUrl: string | null; imageUrl?: string; ok: boolean; selector?: string | null; logs?: unknown },
  log: (m: string) => void
) {
  try {
    if ((prisma as any).zzapRequest?.create) {
      await (prisma as any).zzapRequest.create({
        data: {
          provider: 'zzap',
          article: data.article,
          statsUrl: data.statsUrl || undefined,
          imageUrl: data.imageUrl || undefined,
          ok: data.ok,
          selector: data.selector || undefined,
          logs: data.logs ?? undefined
        }
      })
      log('DB: request persisted')
    } else {
      const esc = (v: any) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)
      const logsJson = data.logs ? `'${JSON.stringify(data.logs).replace(/'/g, "''")}'::jsonb` : 'NULL'
      const sql = `INSERT INTO "zzap_requests" ("provider","article","statsUrl","imageUrl","ok","selector","logs") VALUES ('zzap', ${esc(data.article)}, ${esc(data.statsUrl)}, ${esc(data.imageUrl)}, ${data.ok ? 'true' : 'false'}, ${esc(data.selector)}, ${logsJson})`
      await prisma.$executeRawUnsafe(sql)
      log('DB: request persisted (raw)')
    }
  } catch (e: any) {
    log(`DB error: ${e?.message || e}`)
  }
}

async function restoreSession(page: Page, log: (m: string) => void) {
  try {
    if (!fs.existsSync(COOKIE_FILE)) return false
    const raw = fs.readFileSync(COOKIE_FILE, 'utf-8')
    const data = JSON.parse(raw) as { cookies: any[]; savedAt: number }
    if (!data?.cookies?.length || !data?.savedAt) return false
    const ageMin = (Date.now() - data.savedAt) / 60000
    if (ageMin > COOKIE_TTL_MIN) { log(`Session expired: ${ageMin.toFixed(1)}min > ${COOKIE_TTL_MIN}min`); return false }
    await page.setCookie(...data.cookies)
    log('Session cookies restored')
    return true
  } catch (e) {
    log(`Restore session error: ${String((e as any)?.message || e)}`)
    return false
  }
}

async function saveSession(page: Page, log: (m: string) => void) {
  try {
    const cookies = await page.cookies()
    const payload = { cookies, savedAt: Date.now() }
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(payload))
    log(`Session cookies saved (${cookies.length})`)
  } catch (e) {
    log(`Save session error: ${String((e as any)?.message || e)}`)
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const article = searchParams.get('article')?.trim()
  const explicitSelector = searchParams.get('selector')?.trim()
  const debug = searchParams.get('debug') === '1'
  if (!article) {
    return new Response(JSON.stringify({ error: 'Не передан артикул ?article=' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }

  const email = process.env.ZZAP_EMAIL
  const password = process.env.ZZAP_PASSWORD
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Отсутствуют ZZAP_EMAIL/ZZAP_PASSWORD в .env' }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }

  const logs: string[] = []
  const log = (m: string) => { logs.push(m) }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    let workPage: Page = page
    await page.setViewport({ width: 1440, height: 900 })
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' })
    try { page.setDefaultNavigationTimeout?.(ZZAP_TIMEOUT_MS); page.setDefaultTimeout?.(ZZAP_TIMEOUT_MS) } catch {}

    // 0) Try restore session first, verify, otherwise login
    let loggedInEarly = false
    await restoreSession(page, log)
    try {
      await page.goto(ZZAP_BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
      const byDom = await page.evaluate(() => {
        const byId = !!document.querySelector('#ctl00_lnkLogout')
        const byText = Array.from(document.querySelectorAll('a')).some(a => /выход|выйти|logout|logoff/i.test((a.textContent||'').trim()))
        return byId || byText
      }).catch(() => false)
      loggedInEarly = Boolean(byDom)
      log(`Restored session check: loggedIn=${loggedInEarly}`)
    } catch {}

    // 0b) Explicit login if not logged yet
    try {
      if (!loggedInEarly) {
        await page.goto(`${ZZAP_BASE}/user/logon.aspx`, { waitUntil: 'domcontentloaded', timeout: Math.min(20000, ZZAP_TIMEOUT_MS) })
        log(`Open login: ${page.url()}`)
      } else {
        log('Skip login: already authenticated')
      }

      // DevExpress (ZZap) stable selectors by id suffix / full name
      const devxEmail = 'input[id$="AddrEmail1TextBox_I"]'
      const devxPass = 'input[id$="PasswordTextBox_I"]'
      const devxEmailName = 'input[name="ctl00$BodyPlace$LogonFormCallbackPanel$LogonFormLayout$AddrEmail1TextBox"]'
      const devxPassName = 'input[name="ctl00$BodyPlace$LogonFormCallbackPanel$LogonFormLayout$PasswordTextBox"]'
      const devxEmailFull = '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_AddrEmail1TextBox_I'
      const devxPassFull = '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_PasswordTextBox_I'

      // Prefer known DevExpress IDs first, then legacy ASP.NET, then generic
      const userSelPriority = [devxEmailFull, devxEmail, devxEmailName, '#ctl00_ContentPlaceHolder1_Login1_UserName', '#ctl00_ContentPlaceHolder1_tbLogin', 'input[name*="login" i]', 'input[type="email"]', 'input[name*="email" i]']
      const passSelPriority = [devxPassFull, devxPass, devxPassName, '#ctl00_ContentPlaceHolder1_Login1_Password', '#ctl00_ContentPlaceHolder1_tbPass', 'input[type="password"]', 'input[name*="pass" i]']
      const submitSelPriority = ['#ctl00_ContentPlaceHolder1_Login1_LoginButton', '#ctl00_ContentPlaceHolder1_btnLogin', 'button[type="submit" i]', 'input[type="submit" i]']

      // Wait a moment for anti-bot/DevExpress to initialize
      if (!loggedInEarly) await sleep(2000)

      // Wait for any input to appear explicitly
      const appeared = await waitForAnySelector(page, [devxEmailFull, devxPassFull, devxEmail, devxPass, devxEmailName, devxPassName], 10000)
      if (!appeared) log('Login inputs still not present after wait')

      // Try waiting explicitly for DevExpress fields
      // Resolve selectors to strings (avoid handle click issues)
      const emailSelectors = [devxEmailFull, devxEmail, devxEmailName, '#ctl00_ContentPlaceHolder1_Login1_UserName', '#ctl00_ContentPlaceHolder1_tbLogin', 'input[name*="login" i]', 'input[type="email"]', 'input[name*="email" i]']
      const passSelectors = [devxPassFull, devxPass, devxPassName, '#ctl00_ContentPlaceHolder1_Login1_Password', '#ctl00_ContentPlaceHolder1_tbPass', 'input[type="password"]', 'input[name*="pass" i]']

      let emailSelUsed: string | null = null
      for (const sel of emailSelectors) { if (await setInputValue(page, sel, email)) { emailSelUsed = sel; break } }
      // No XPath fallback to avoid $x in older runtimes

      let passSelUsed: string | null = null
      for (const sel of passSelectors) { if (await setInputValue(page, sel, password)) { passSelUsed = sel; break } }
      // No XPath fallback to avoid $x in older runtimes

      if (!loggedInEarly && emailSelUsed && passSelUsed) {
        log(`Login using emailSel=${emailSelUsed}, passSel=${passSelUsed}`)

        // Helper to detect login without relying only on nav
        const checkLoggedIn = async () => {
          const url = page.url()
          if (!/logon\.aspx/i.test(url)) return true
          const byDom = await page.evaluate(() => {
            const byId = !!document.querySelector('#ctl00_lnkLogout')
            const byText = Array.from(document.querySelectorAll('a')).some(a => /выход|выйти|logout|logoff/i.test((a.textContent||'').trim()))
            return byId || byText
          }).catch(() => false)
          return byDom
        }

        const waitStep = async (label: string) => {
          await sleep(1500)
          const ok = await checkLoggedIn()
          log(`${label} -> loggedIn=${ok}, url=${page.url()}`)
          return ok
        }

        let loggedIn = false

        // 1) Press Enter on password
        try { await page.focus(passSelUsed); await page.keyboard.press('Enter') ; } catch {}
        loggedIn = await waitStep('After Enter')

        // 2) Click submit via known selectors
        if (!loggedIn) {
          for (const sel of submitSelPriority) {
            try {
              const el = await page.$(sel)
              if (el) {
                await el.click().catch(() => {})
                if (await waitStep(`After click ${sel}`)) { loggedIn = true; break }
              }
            } catch {}
          }
        }

        // 3) Click any descendant with text "Войти" inside login panel
        if (!loggedIn) {
          try {
            const did = await page.evaluate(() => {
              const root = document.querySelector('#ctl00_BodyPlace_LogonFormCallbackPanel') || document.body
              if (!root) return false
              const nodes = Array.from(root.querySelectorAll('button, a, span, div, input[type="submit"]')) as HTMLElement[]
              const lc = 'войти'
              for (const el of nodes) {
                const txt = (el.innerText || el.textContent || '').trim().toLowerCase()
                if (!txt) continue
                if (txt.includes(lc)) { (el as HTMLElement).click(); return true }
              }
              return false
            })
            if (did) loggedIn = await waitStep('After panel text click')
          } catch {}
        }

        // 4) Try submitting the form directly
        if (!loggedIn) {
          try { await page.evaluate(() => { (document.querySelector('form') as HTMLFormElement | null)?.submit() }) } catch {}
          loggedIn = await waitStep('After form.submit()')
        }

        log(`Login success=${loggedIn}`)
        if (loggedIn) { await saveSession(page, log) }
      } else {
        if (!loggedInEarly) log('Login inputs not found; continuing')
      }

      const cookies = await page.cookies()
      log(`Cookies: ${cookies.map(c=>c.name).join(',')}`)
    } catch (e: any) {
      log(`Login step error: ${e?.message || e}`)
    }

    // 1) Open homepage
    await page.goto(ZZAP_BASE, { waitUntil: 'domcontentloaded', timeout: Math.min(15000, ZZAP_TIMEOUT_MS) })
    log(`Open: ${page.url()}`)

    // Cookie banners common accept
    await clickByText(page, 'Соглас').catch(() => {})
    await clickByText(page, 'Принять').catch(() => {})
    await clickByText(page, 'Хорошо').catch(() => {})

    // 2) Try to open login
    const loginCandidates = ['a[href*="login" i]', 'a[href*="signin" i]', 'button[name="login" i]']
    let openedLogin = false
    for (const sel of loginCandidates) {
      const el = await page.$(sel)
      if (el) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
          el.click()
        ])
        openedLogin = true
        break
      }
    }
    if (!openedLogin) {
      await clickByText(page, 'войти').catch(() => {})
    }
    log(`Login page: ${page.url()}`)

    // 3) Fill credentials
    // Try DevExpress selectors first on whatever login UI is visible
    const emailSel = ['#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_AddrEmail1TextBox_I', 'input[id$="AddrEmail1TextBox_I"]', 'input[name="ctl00$BodyPlace$LogonFormCallbackPanel$LogonFormLayout$AddrEmail1TextBox"]', 'input[type="email"]', 'input[name="email" i]', 'input[name*="login" i]']
    const passSel = ['#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_PasswordTextBox_I', 'input[id$="PasswordTextBox_I"]', 'input[name="ctl00$BodyPlace$LogonFormCallbackPanel$LogonFormLayout$PasswordTextBox"]', 'input[type="password"]', 'input[name="password" i]']
    let emailInput: ElementHandle<Element> | null = null
    for (const sel of emailSel) { emailInput = await page.$(sel); if (emailInput) break }
    let passInput: ElementHandle<Element> | null = null
    for (const sel of passSel) { passInput = await page.$(sel); if (passInput) break }

    if (emailInput && passInput) {
      await emailInput.click({ clickCount: 3 }).catch(() => {})
      await emailInput.type(email, { delay: 20 })
      await passInput.type(password, { delay: 20 })
      const submitSel = ['button[type="submit" i]', 'input[type="submit" i]']
      let clicked = false
      for (const sel of submitSel) {
        const el = await page.$(sel)
        if (el) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {}),
            el.click()
          ])
          clicked = true
          break
        }
      }
      if (!clicked) {
        await clickByText(page, 'войти').catch(() => {})
        await sleep(1500)
      }
    }
    log(`After login: ${page.url()}`)

    // 4) Navigate to search by article (try a few patterns)
    const searchUrls = [
      `${ZZAP_BASE}/public/search.aspx#rawdata=${encodeURIComponent(article)}`,
      `${ZZAP_BASE}/search/?article=${encodeURIComponent(article)}`,
      `${ZZAP_BASE}/search?article=${encodeURIComponent(article)}`,
      `${ZZAP_BASE}/search?txt=${encodeURIComponent(article)}`,
      `${ZZAP_BASE}/search?query=${encodeURIComponent(article)}`,
      `${ZZAP_BASE}/catalog/?q=${encodeURIComponent(article)}`
    ]

    let reached = false
    for (const url of searchUrls) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.min(15000, ZZAP_TIMEOUT_MS) })
        log(`Search try: ${url} -> ${page.url()}`)
        reached = true
        break
      } catch {}
    }

    if (!reached) {
      // fallback: try search input on homepage
      await page.goto(ZZAP_BASE, { waitUntil: 'domcontentloaded', timeout: Math.min(15000, ZZAP_TIMEOUT_MS) })
      const inputCandidates = ['input[type="search"]', 'input[name*="search" i]', 'input[placeholder*="артик" i]']
      let searchInput: ElementHandle<Element> | null = null
      for (const sel of inputCandidates) { searchInput = await page.$(sel); if (searchInput) break }
      if (!searchInput) throw new Error('Не найдено поле поиска')
      await searchInput.type(article, { delay: 30 })
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: Math.min(15000, ZZAP_TIMEOUT_MS) }).catch(() => {}),
        page.keyboard.press('Enter')
      ])
    }
    log(`Search results: ${page.url()}`)

    // 4b) Try to open stats via explicit anchor present in the grid
    try {
      const statLinkSel = 'a[id$="_StatHyperlink"], a[onclick*="statpartpricehistory.aspx" i]'
      const statLink = await page.waitForSelector(statLinkSel, { timeout: Math.min(8000, ZZAP_TIMEOUT_MS) }).catch(() => null)
      if (statLink) {
        const rel = await statLink.evaluate((el: HTMLAnchorElement) => {
          const href = el.getAttribute('href') || ''
          const onclick = el.getAttribute('onclick') || ''
          const rx = /['"]([^'\"]*statpartpricehistory\.aspx[^'\"]*)['"]/i
          const m = onclick.match(rx)
          const candidate = m ? m[1] : (href && href.includes('statpartpricehistory') ? href : null)
          return candidate ? candidate.replace(/&amp;/g, '&') : null
        })
        if (rel) {
          const targetUrl = rel.startsWith('http') ? rel : `${ZZAP_BASE}${rel}`
          const statsPage = await browser.newPage()
          await statsPage.setViewport({ width: 1440, height: 900 })
          await statsPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
          await statsPage.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' })
          const cookies = await page.cookies()
          await statsPage.setCookie(...cookies)
          await statsPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: Math.min(15000, ZZAP_TIMEOUT_MS) })
          workPage = statsPage
          log(`Stats page opened via anchor onclick: ${targetUrl}`)
        }
      }
    } catch {}

    // If we already opened stats page directly, skip modal logic
    const onStatsPage = () => /\/user\/statpartpricehistory\.aspx/i.test(workPage.url?.() || '')
    let statsOpened = onStatsPage()
    if (statsOpened) {
      log(`Stats page already open: ${workPage.url?.()}`)
    }
    // 5) Open statistics (open modal, extract iframe src, load it as page) or new page

    // Attempt 0: scrape any statpartpricehistory URL from page HTML (onclick/inline)
    try {
      const rel = await page.evaluate(() => {
        const html = document.documentElement?.outerHTML || ''
        const m = html.match(/(https?:\/\/[^"'<> ]+)?(\/user\/statpartpricehistory\.aspx[^"'<> ]*)/i)
        if (!m) return null
        const full = m[1] ? `${m[1]}${m[2]}` : m[2]
        return full.replace(/&amp;/g, '&')
      })
      if (rel) {
        const targetUrl = rel.startsWith('http') ? rel : `${ZZAP_BASE}${rel}`
        const statsPage = await browser.newPage()
        await statsPage.setViewport({ width: 1440, height: 900 })
        await statsPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
        await statsPage.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' })
        const cookies = await page.cookies()
        await statsPage.setCookie(...cookies)
        await statsPage.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 })
        workPage = statsPage
        statsOpened = true
        log(`Stats page opened via HTML scrape: ${targetUrl}`)
      }
    } catch {}
    if (!statsOpened) {
      await clickByText(page, 'статистика').catch(() => {})
      try {
        const clickedByTitle = await page.evaluate(() => {
          const cand = document.querySelector('[title*="статист" i], [alt*="статист" i]') as HTMLElement | null
          if (cand) { cand.click(); return true }
          return false
        })
        if (clickedByTitle) { log('Clicked stats by title/alt attribute') }
      } catch {}
      await sleep(500)
    }
    // Look for iframe anywhere, not only inside DevExpress container
    let modalIframeHandle = statsOpened ? null : await page.waitForSelector('iframe[src*="statpartpricehistory.aspx"]', { timeout: Math.min(4000, ZZAP_TIMEOUT_MS) }).catch(() => null)
    if (!modalIframeHandle) {
      // one more short wait and retry
      if (!statsOpened) {
        await sleep(300)
        modalIframeHandle = await page.waitForSelector('iframe[src*="statpartpricehistory.aspx"]', { timeout: Math.min(2500, ZZAP_TIMEOUT_MS) }).catch(() => null)
      }
    }
    if (modalIframeHandle) {
      statsOpened = true
      try {
        const src: string | null = await modalIframeHandle.evaluate((el: HTMLIFrameElement) => el.getAttribute('src'))
        if (src) {
          const targetUrl = src.startsWith('http') ? src : `${ZZAP_BASE}${src}`
          const statsPage = await browser.newPage()
          await statsPage.setViewport({ width: 1440, height: 900 })
          await statsPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
          await statsPage.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' })
          // Reuse session cookies
          const cookies = await page.cookies()
          await statsPage.setCookie(...cookies)
          await statsPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: Math.min(15000, ZZAP_TIMEOUT_MS) })
          workPage = statsPage
          log(`Stats page opened via iframe src: ${targetUrl}`)
          // We won't use the iframe anymore
          modalIframeHandle = null
        }
      } catch {}
    }
    if (!statsOpened || workPage === page) {
      // Fallback: direct link on page to statpartpricehistory
      try {
        const rel = await page.evaluate(() => {
          const a = document.querySelector('a[href*="statpartpricehistory.aspx"]') as HTMLAnchorElement | null
          return a?.getAttribute('href') || null
        })
        if (rel) {
          const targetUrl = rel.startsWith('http') ? rel : `${ZZAP_BASE}${rel}`
          const statsPage = await browser.newPage()
          await statsPage.setViewport({ width: 1440, height: 900 })
          await statsPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
          await statsPage.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' })
          const cookies = await page.cookies()
          await statsPage.setCookie(...cookies)
          await statsPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: Math.min(15000, ZZAP_TIMEOUT_MS) })
          workPage = statsPage
          statsOpened = true
          log(`Stats page opened via anchor href: ${targetUrl}`)
        }
      } catch {}
    }
    if (!statsOpened || workPage === page) {
      // Fallback: explicit selectors that might open new page
      const statsSelectors = ['a[href*="statpartpricehistory" i]', 'a[href*="stat" i]', 'button[href*="stat" i]']
      for (const sel of statsSelectors) {
        const el = await page.$(sel)
        if (el) {
          const targetCreated = new Promise<any>((resolve) => {
            const handler = async (target: any) => {
              const newPage = await target.page().catch(() => null)
              if (newPage) {
                browser.off('targetcreated', handler)
                resolve(newPage)
              }
            }
            browser.on('targetcreated', handler)
          })
          await el.click().catch(() => {})
          const maybeNewPage: any = await Promise.race([
            targetCreated,
            (async () => { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: Math.min(8000, ZZAP_TIMEOUT_MS) }).catch(() => {}) ; return null })()
          ])
          if (maybeNewPage) {
            workPage = maybeNewPage
            await sleep(1200)
          }
          statsOpened = true
          break
        }
      }
    }
    log(`Stats page: ${workPage.url?.() || page.url()}`)

    // Early bailout: if we couldn't navigate away from search page quickly, return its screenshot
    try {
      const urlNow = workPage.url?.() || page.url()
      if (/\/public\/search\.aspx/i.test(urlNow)) {
        log('Bailout: still on search page, returning current page screenshot')
        const buf = (await page.screenshot({ fullPage: true, type: 'png' })) as Buffer
        // Save to S3 + DB history
        try {
          const key = `zzap/${encodeURIComponent(article)}/${Date.now()}-search.png`
          const up = await uploadBuffer(buf, key, 'image/png')
          logs.push(`Uploaded to S3: ${up.url}`)
          await persistHistorySafely({ article, statsUrl: urlNow, imageUrl: up.url, ok: false, selector: null, logs }, log)
        } catch (e: any) {
          logs.push(`Persist error (bailout): ${e?.message || e}`)
        }
        await browser.close().catch(() => {})
        if (debug) {
          return new Response(JSON.stringify({ ok: true, url: urlNow, foundSelector: null, logs }), {
            status: 200,
            headers: { 'content-type': 'application/json; charset=utf-8' }
          })
        }
        return new Response(buf, { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'no-store' } })
      }
    } catch {}

    // 6) Wait a bit for charts to render (short)
    if (onStatsPage()) {
      try { await (workPage.waitForSelector?.('.highcharts-container', { timeout: Math.min(3000, ZZAP_TIMEOUT_MS) })) } catch {}
      await sleep(300)
    }

    // 7) Capture element screenshot
    let handle = null as any
    // No modal any more – we open stats full page; try in current/new page context
    if (explicitSelector) {
      handle = await workPage.$(explicitSelector)
    }
    if (!handle) {
      handle = await findLargestElementHandle(workPage, [
        '.highcharts-container',
        'canvas',
        'svg',
        '[id*="chart" i]',
        '[class*="chart" i]'
      ])
    }

    let imageBuffer: Buffer
    let foundSelector: string | null = null
    if (!onStatsPage() && handle) {
      try { await handle.evaluate((el: any) => el.scrollIntoView({ behavior: 'instant', block: 'center' })) } catch {}
      await sleep(300)
      foundSelector = explicitSelector || 'auto'
      imageBuffer = (await handle.screenshot({ type: 'png' })) as Buffer
    } else {
      // Full-page screenshot (stats page often has 3 charts; capture all)
      imageBuffer = (await workPage.screenshot({ fullPage: true, type: 'png' })) as Buffer
    }

    // Upload to S3 and persist history
    let uploadedUrl: string | undefined
    try {
      const key = `zzap/${encodeURIComponent(article)}/${Date.now()}.png`
      const up = await uploadBuffer(imageBuffer, key, 'image/png')
      uploadedUrl = up.url
      logs.push(`Uploaded to S3: ${up.url}`)
    } catch (e: any) {
      logs.push(`S3 upload error: ${e?.message || e}`)
    }
    await persistHistorySafely({ article, statsUrl: workPage.url?.() || page.url(), imageUrl: uploadedUrl, ok: true, selector: foundSelector, logs }, log)

    await browser.close().catch(() => {})

    if (debug) {
      return new Response(JSON.stringify({ ok: true, url: workPage.url?.() || page.url(), foundSelector, imageUrl: uploadedUrl, logs }), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      })
    }

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'no-store'
      }
    })
  } catch (err: any) {
    const errorBody = { error: String(err?.message || err || 'Unknown error'), logs }
    return new Response(JSON.stringify(errorBody), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    })
  }
}
