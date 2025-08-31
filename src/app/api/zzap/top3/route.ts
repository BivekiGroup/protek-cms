import type { NextRequest } from "next/server"
import puppeteer from "puppeteer"
import type { Page, ElementHandle } from "puppeteer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ZZAP_BASE = process.env.ZZAP_BASE || "https://www.zzap.ru"
const ZZAP_TIMEOUT_MS = Number(process.env.ZZAP_TIMEOUT_MS || 30000)

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function clickByText(page: Page, text: string) {
  const handle = await page.evaluateHandle((t: string) => {
    const target = t.toLowerCase()
    const candidates = Array.from(document.querySelectorAll("button, a, input[type=\"submit\"], span, div")) as HTMLElement[]
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || "").trim().toLowerCase()
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const article = searchParams.get("article")?.trim()
  const selector = searchParams.get("selector")?.trim() || ".right.dx-wrap.dxgv.pricewhitecell"

  if (!article) {
    return Response.json({ error: "Артикул обязателен" }, { status: 400 })
  }

  let browser: any = null

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' })
    try { page.setDefaultNavigationTimeout?.(ZZAP_TIMEOUT_MS); page.setDefaultTimeout?.(ZZAP_TIMEOUT_MS) } catch {}

    // 1. Открываем ZZAP и ищем артикул
    const brand = searchParams.get("brand")?.trim();
    const searchUrls = [
      brand
        ? `${ZZAP_BASE}/public/search.aspx#rawdata=${encodeURIComponent(article)}&class_man=${encodeURIComponent(brand)}&partnumber=${encodeURIComponent(article)}`
        : `${ZZAP_BASE}/public/search.aspx#rawdata=${encodeURIComponent(article)}`,
      brand
        ? `${ZZAP_BASE}/search/?article=${encodeURIComponent(article)}&class_man=${encodeURIComponent(brand)}`
        : `${ZZAP_BASE}/search/?article=${encodeURIComponent(article)}`,
      `${ZZAP_BASE}/search?article=${encodeURIComponent(article)}`,
      `${ZZAP_BASE}/search?txt=${encodeURIComponent(article)}`,
      `${ZZAP_BASE}/search?query=${encodeURIComponent(article)}`,
      `${ZZAP_BASE}/catalog/?q=${encodeURIComponent(article)}`
    ]
    let reached = false
    for (const url of searchUrls) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: ZZAP_TIMEOUT_MS })
        reached = true
        break
      } catch {}
    }
    if (!reached) {
      throw new Error("Не удалось открыть страницу поиска")
    }

    // 2. Пытаемся найти ссылку на страницу с ценами/statpartpricehistory
    let workPage: Page = page
    let statsOpened = false
    // Пробуем найти ссылку на статистику (statpartpricehistory)
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
        await statsPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
        await statsPage.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' })
        const cookies = await page.cookies()
        await statsPage.setCookie(...cookies)
        await statsPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: ZZAP_TIMEOUT_MS })
        workPage = statsPage
        statsOpened = true
      }
    } catch {}

    // 3. Если не нашли, пробуем кликнуть по ссылке "Статистика"
    if (!statsOpened) {
      await clickByText(page, 'статистика').catch(() => {})
      await sleep(1000)
      // Пробуем найти iframe с src на statpartpricehistory
      let modalIframeHandle = await page.waitForSelector('iframe[src*="statpartpricehistory.aspx"]', { timeout: 4000 }).catch(() => null)
      if (modalIframeHandle) {
        try {
          const src: string | null = await modalIframeHandle.evaluate((el: HTMLIFrameElement) => el.getAttribute('src'))
          if (src) {
            const targetUrl = src.startsWith('http') ? src : `${ZZAP_BASE}${src}`
            const statsPage = await browser.newPage()
            await statsPage.setViewport({ width: 1440, height: 900 })
            await statsPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
            await statsPage.setExtraHTTPHeaders({ 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7' })
            const cookies = await page.cookies()
            await statsPage.setCookie(...cookies)
            await statsPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: ZZAP_TIMEOUT_MS })
            workPage = statsPage
            statsOpened = true
          }
        } catch {}
      }
    }

    // 4. Ждем появления таблицы с ценами
    await sleep(2000)

    // 5. Парсим топ-3 цены на workPage
    const prices = await workPage.evaluate((sel) => {
      const elements = document.querySelectorAll(sel)
      const priceData: Array<{position: number; price: number; priceText: string}> = []
      for (let i = 0; i < Math.min(3, elements.length); i++) {
        const element = elements[i] as HTMLElement
        const priceText = element.innerText || element.textContent || ""
        const price = priceText.replace(/[^\d.,]/g, "").replace(",", ".")
        if (price && !isNaN(parseFloat(price))) {
          priceData.push({
            position: i + 1,
            price: parseFloat(price),
            priceText: priceText.trim()
          })
        }
      }
      return priceData
    }, selector)

    return Response.json({
      success: true,
      article,
      selector,
      prices,
      total: prices.length
    })

  } catch (error: any) {
    console.error("ZZAP Top3 Error:", error)
    return Response.json({ 
      error: error.message || "Ошибка получения топ-3 цен",
      article,
      selector 
    }, { status: 500 })
  } finally {
    if (browser) {
      try { await browser.close() } catch {}
    }
  }
}
