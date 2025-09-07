import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import puppeteer, { Page } from "puppeteer";
import fs from 'fs'
import path from "path";
import * as XLSX from "xlsx";
import { uploadBuffer } from "@/lib/s3";
import { randomUUID } from 'crypto'

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ZZAP_BASE = process.env.ZZAP_BASE || "https://www.zzap.ru";
const ZZAP_TIMEOUT_MS = Number(process.env.ZZAP_TIMEOUT_MS || 30000);
const RUNTIME_DIR = process.env.APP_WRITE_DIR || process.cwd();
const COOKIE_FILE =
  process.env.ZZAP_COOKIE_FILE ||
  path.join(RUNTIME_DIR, ".zzap-session.json");
const COOKIE_TTL_MIN = Number(process.env.ZZAP_SESSION_TTL_MINUTES || 180);
// Gentle-mode delays: increase sane defaults to avoid anti-bot and duplication
// Base delay 2000ms with up to +3000ms jitter (2s..5s) if envs are not set
const ZZAP_DELAY_MS = Number(process.env.ZZAP_BETWEEN_ITEMS_DELAY_MS || 2000);
const ZZAP_DELAY_JITTER_MS = Number(
  process.env.ZZAP_BETWEEN_ITEMS_JITTER_MS || 3000
);
const ZZAP_DEBUG_SHOTS = String(process.env.ZZAP_DEBUG_SHOTS || '').trim() === '1'
// DX debounce: how long to wait after last matching response
const ZZAP_DX_IDLE_MS = Number(process.env.ZZAP_DX_IDLE_MS || 1800)
const ZZAP_DX_MAX_WAIT_MS = Number(process.env.ZZAP_DX_MAX_WAIT_MS || 15000)

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(base: number, jitter: number) {
  const j = Math.floor(Math.random() * Math.max(0, jitter));
  return base + j;
}

async function pageContainsArticleBrand(
  page: Page,
  article: string,
  brand?: string
): Promise<boolean> {
  try {
    const ok = await page.evaluate((art: string, br?: string) => {
      const normalize = (s: string) => (s || '').replace(/[^0-9a-zA-Zа-яА-Я]+/g, '').toUpperCase();
      const wantArt = normalize(art);
      const wantBr = br ? normalize(br) : '';
      const collectDocs = (): Document[] => {
        const docs: Document[] = [document];
        const ifr = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
        for (const f of ifr) { try { const d = f.contentDocument as Document | null; if (d) docs.push(d) } catch {} }
        return docs;
      };
      const docs = collectDocs();
      for (const d of docs) {
        // Prefer grid rows text to reduce noise
        const rows = Array.from(d.querySelectorAll('tr[id*="SearchGridView_DXDataRow"], tr[id*="GridView_DXDataRow"]')) as HTMLTableRowElement[];
        const hasInRows = rows.some(tr => {
          const t = (tr.innerText || '').toUpperCase();
          const n = t.replace(/[^0-9a-zA-Zа-яА-Я]+/g, '');
          if (wantBr && !t.includes((br || '').toUpperCase())) return false;
          return n.includes(wantArt);
        });
        if (hasInRows) return true;
        // Fallback: full text if rows not present
        const full = (d.body?.innerText || '').toUpperCase();
        const norm = full.replace(/[^0-9a-zA-Zа-яА-Я]+/g, '');
        if ((!wantBr || full.includes((br || '').toUpperCase())) && norm.includes(wantArt)) return true;
      }
      return false;
    }, article, brand);
    return !!ok;
  } catch {
    return false;
  }
}

function normalizePrice(text: string): number | null {
  const cleaned = text
    .replace(/[^0-9.,]/g, "")
    .replace(/\s+/g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function restoreSession(page: Page): Promise<boolean> {
  try {
    if (!fs.existsSync(COOKIE_FILE)) return false;
    const raw = fs.readFileSync(COOKIE_FILE, "utf-8");
    const data = JSON.parse(raw) as { cookies: any[]; savedAt: number };
    if (!data?.cookies?.length || !data?.savedAt) return false;
    const ageMin = (Date.now() - data.savedAt) / 60000;
    if (ageMin > COOKIE_TTL_MIN) return false;
    await page.setCookie(...data.cookies);
    return true;
  } catch {
    return false;
  }
}

async function saveSession(page: Page) {
  try {
    const cookies = await page.cookies();
    fs.writeFileSync(
      COOKIE_FILE,
      JSON.stringify({ cookies, savedAt: Date.now() })
    );
  } catch {}
}

async function ensureAuthenticated(
  page: Page,
  jobId?: string
): Promise<boolean> {
  try {
    // Quick check on homepage
    await page
      .goto(ZZAP_BASE, {
        waitUntil: "domcontentloaded",
        timeout: ZZAP_TIMEOUT_MS,
      })
      .catch(() => {});
    const logged = await page
      .evaluate(() => {
        const byId = !!document.querySelector("#ctl00_lnkLogout");
        const byText = Array.from(document.querySelectorAll("a")).some((a) =>
          /выход|logout|logoff/i.test((a.textContent || "").trim())
        );
        return byId || byText;
      })
      .catch(() => false);
    if (logged) {
      if (jobId) appendJobLog(jobId, "auth: already logged in");
      return true;
    }
  } catch {}
  try {
    // Try inline login
    const email = process.env.ZZAP_EMAIL || "";
    const password = process.env.ZZAP_PASSWORD || "";
    await page
      .goto(`${ZZAP_BASE}/user/logon.aspx`, {
        waitUntil: "domcontentloaded",
        timeout: ZZAP_TIMEOUT_MS,
      })
      .catch(() => {});
    const emailSel =
      '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_AddrEmail1TextBox_I, input[type="email"]';
    const passSel =
      '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_PasswordTextBox_I, input[type="password"]';
    await page.type(emailSel, email).catch(() => {});
    await page.type(passSel, password).catch(() => {});
    await Promise.all([
      page
        .waitForNavigation({
          waitUntil: "domcontentloaded",
          timeout: ZZAP_TIMEOUT_MS,
        })
        .catch(() => {}),
      (async () => {
        try {
          await page.keyboard.press("Enter");
        } catch {}
      })(),
    ]);
    // Fallbacks
    const stillLogon = /\/logon\.aspx/i.test(page.url());
    if (stillLogon) {
      const submitSel = [
        "#ctl00_ContentPlaceHolder1_Login1_LoginButton",
        "#ctl00_ContentPlaceHolder1_btnLogin",
        'button[type="submit" i]',
        'input[type="submit" i]',
      ];
      for (const sel of submitSel) {
        const el = await page.$(sel);
        if (el) {
          await Promise.all([
            page
              .waitForNavigation({
                waitUntil: "domcontentloaded",
                timeout: ZZAP_TIMEOUT_MS,
              })
              .catch(() => {}),
            el.click().catch(() => {}),
          ]);
          break;
        }
      }
    }
    // DevExpress client API fallback
    if (/\/logon\.aspx/i.test(page.url())) {
      await page.evaluate(() => {
        try {
          const w: any = window as any;
          const coll = w.ASPx?.GetControlCollection?.();
          const base =
            "ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_";
          const emailCtrl = coll?.Get?.(base + "AddrEmail1TextBox");
          const passCtrl = coll?.Get?.(base + "PasswordTextBox");
          try {
            emailCtrl?.SetValue?.(
              (
                document.querySelector(
                  "#" + base + "AddrEmail1TextBox_I"
                ) as any
              )?.value || ""
            );
          } catch {}
          try {
            passCtrl?.SetValue?.(
              (document.querySelector("#" + base + "PasswordTextBox_I") as any)
                ?.value || ""
            );
          } catch {}
          const btn =
            coll?.Get?.(base + "LoginButton") ||
            coll?.Get?.(base + "LogonButton") ||
            coll?.Get?.(base + "btnLogin");
          if (btn?.DoClick) {
            try {
              btn.DoClick();
            } catch {}
          } else {
            try {
              if (w.__doPostBack) {
                w.__doPostBack((base + "LoginButton").replace(/_/g, "$"), "");
              }
            } catch {}
          }
        } catch {}
      });
      await sleep(1200);
    }
    await saveSession(page);
    // Verify
    const ok = await page
      .evaluate(() => {
        const byId = !!document.querySelector("#ctl00_lnkLogout");
        const byText = Array.from(document.querySelectorAll("a")).some((a) =>
          /выход|logout|logoff/i.test((a.textContent || "").trim())
        );
        return byId || byText;
      })
      .catch(() => false);
    return ok;
  } catch {
    return false;
  }
}

function resolvePuppeteerExec(): string | undefined {
  const fromEnv = (process.env.PUPPETEER_EXECUTABLE_PATH || '').trim()
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ]
  for (const p of candidates) { try { if (fs.existsSync(p)) return p } catch {} }
  return undefined
}

async function loginAndGetPage(): Promise<Page> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolvePuppeteerExec(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(ZZAP_TIMEOUT_MS);
  page.setDefaultTimeout(ZZAP_TIMEOUT_MS);
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
  );
  try {
    await page.setExtraHTTPHeaders({
      "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    });
  } catch {}
  await restoreSession(page);
  const ok = await ensureAuthenticated(page);
  if (!ok) {
    // Try explicit login page one more time
    const email = process.env.ZZAP_EMAIL || "";
    const password = process.env.ZZAP_PASSWORD || "";
    await page
      .goto(`${ZZAP_BASE}/user/logon.aspx`, { waitUntil: "domcontentloaded" })
      .catch(() => {});
    const emailSel =
      '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_AddrEmail1TextBox_I, input[type="email"]';
    const passSel =
      '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_PasswordTextBox_I, input[type="password"]';
    await page.type(emailSel, email).catch(() => {});
    await page.type(passSel, password).catch(() => {});
    // Try submit by Enter
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
      (async () => {
        try {
          await page.keyboard.press("Enter");
        } catch {}
      })(),
    ]);
    // If still on logon, try explicit click selectors
    try {
      const stillLogon = /\/logon\.aspx/i.test(page.url());
      if (stillLogon) {
        const submitSel = [
          "#ctl00_ContentPlaceHolder1_Login1_LoginButton",
          "#ctl00_ContentPlaceHolder1_btnLogin",
          'button[type="submit" i]',
          'input[type="submit" i]',
        ];
        for (const sel of submitSel) {
          const el = await page.$(sel);
          if (el) {
            await Promise.all([
              page
                .waitForNavigation({ waitUntil: "domcontentloaded" })
                .catch(() => {}),
              el.click().catch(() => {}),
            ]);
            break;
          }
        }
      }
    } catch {}
    // DevExpress client API fallback
    try {
      const stillLogon = /\/logon\.aspx/i.test(page.url());
      if (stillLogon) {
        await page.evaluate(() => {
          try {
            const w: any = window as any;
            const coll = w.ASPx?.GetControlCollection?.();
            const base =
              "ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_";
            const emailCtrl = coll?.Get?.(base + "AddrEmail1TextBox");
            const passCtrl = coll?.Get?.(base + "PasswordTextBox");
            try {
              emailCtrl?.SetValue?.(
                (
                  document.querySelector(
                    "#" + base + "AddrEmail1TextBox_I"
                  ) as any
                )?.value || ""
              );
            } catch {}
            try {
              passCtrl?.SetValue?.(
                (
                  document.querySelector(
                    "#" + base + "PasswordTextBox_I"
                  ) as any
                )?.value || ""
              );
            } catch {}
            const btn =
              coll?.Get?.(base + "LoginButton") ||
              coll?.Get?.(base + "LogonButton") ||
              coll?.Get?.(base + "btnLogin");
            if (btn?.DoClick) {
              try {
                btn.DoClick();
              } catch {}
            } else {
              try {
                if (w.__doPostBack) {
                  w.__doPostBack((base + "LoginButton").replace(/_/g, "$"), "");
                }
              } catch {}
            }
          } catch {}
        });
        // small wait
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch {}
    await saveSession(page);
  }
  return page;
}

async function openSearch(page: Page, article: string, brand?: string) {
  const urls = [
    `${ZZAP_BASE}/public/search.aspx#rawdata=${encodeURIComponent(article)}${
      brand
        ? `&class_man=${encodeURIComponent(
            brand
          )}&partnumber=${encodeURIComponent(article)}`
        : ""
    }`,
    `${ZZAP_BASE}/search/?article=${encodeURIComponent(article)}`,
    `${ZZAP_BASE}/search?article=${encodeURIComponent(article)}`,
    `${ZZAP_BASE}/search?txt=${encodeURIComponent(article)}`,
    `${ZZAP_BASE}/catalog/?q=${encodeURIComponent(article)}`,
  ];
  let navigated = false
  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: ZZAP_TIMEOUT_MS });
      navigated = true
      break
    } catch {}
  }
  if (!navigated) {
    await page.goto(ZZAP_BASE, { waitUntil: "domcontentloaded", timeout: ZZAP_TIMEOUT_MS }).catch(() => {})
  }

  // Try to explicitly trigger search if results grid not present yet
  try {
    const ensured = await page.evaluate(async (art: string, br?: string) => {
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
      const fillAndSubmit = async () => {
        const candidates: (HTMLInputElement | HTMLTextAreaElement)[] = [] as any
        const bySel = (sel: string) => Array.from(document.querySelectorAll(sel)) as any[]
        const pushAll = (arr: any[]) => { for (const el of arr) if (el && (el as any).focus) candidates.push(el as any) }
        pushAll(bySel('input[id*="SearchTextBox" i]'))
        pushAll(bySel('input[name*="SearchTextBox" i]'))
        pushAll(bySel('input[id*="Search" i][type="text" i]'))
        pushAll(bySel('input[type="search" i]'))
        pushAll(bySel('input[placeholder*="поиск" i], input[placeholder*="article" i], input[placeholder*="номер" i]'))
        let used: HTMLInputElement | HTMLTextAreaElement | null = null
        for (const el of candidates) {
          try {
            el.focus();
            (el as any).value = art
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
            used = el
            break
          } catch {}
        }
        // Try DevExpress control API
        try {
          const coll = (window as any).ASPx?.GetControlCollection?.()
          const ids = [
            'ctl00_TopPanel_HeaderPlace_GridLayoutSearchControl_SearchTextBox',
            'ctl00_BodyPlace_SearchTextBox',
            'ctl00_ContentPlaceHolder1_SearchTextBox'
          ]
          for (const id of ids) {
            const ctrl = coll?.Get?.(id)
            if (ctrl?.SetValue) { try { ctrl.SetValue(art) } catch {} }
          }
        } catch {}
        // Press Enter to submit
        try { document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) } catch {}
        try { (document.activeElement as any)?.blur?.() } catch {}
        // Click any visible search button
        const buttons = [
          '#ctl00_TopPanel_HeaderPlace_GridLayoutSearchControl_SearchButton',
          'input[id*="SearchButton" i]',
          'button[id*="Search" i]',
          'input[type="submit" i][value*="Поиск" i]',
          'button[type="submit" i]'
        ]
        for (const sel of buttons) {
          const b = document.querySelector(sel) as HTMLElement | null
          if (b) { try { b.click() } catch {} }
        }
        // Try DevExpress postback
        try {
          const w: any = window as any
          if (typeof w.__doPostBack === 'function') {
            const targets = [
              'ctl00$TopPanel$HeaderPlace$GridLayoutSearchControl$SearchButton',
              'ctl00$BodyPlace$SearchButton'
            ]
            for (const t of targets) { try { w.__doPostBack(t, '') } catch {} }
          }
        } catch {}
        // If suggest list is present and brand provided, try to click a matching brand row
        if (br) {
          try {
            await sleep(300)
            const table = document.querySelector('table[id*="SearchSuggestGridView_DXMainTable" i]') as HTMLTableElement | null
            if (table) {
              const rows = Array.from(table.querySelectorAll('tr')).filter(r => r.id && /DXDataRow/i.test(r.id)) as HTMLTableRowElement[]
              const target = rows.find(tr => ((tr.querySelector('td:nth-child(1)')?.textContent || '').toUpperCase()).includes(br.toUpperCase()))
              if (target) { (target as any).click?.(); (target as any).dispatchEvent?.(new MouseEvent('dblclick', { bubbles: true })) }
            }
          } catch {}
        }
      }
      const hasRows = () => !!document.querySelector('tr[id*="SearchGridView_DXDataRow"], table[id*="SearchGridView_DXMainTable"]')
      if (!hasRows()) { await fillAndSubmit(); await sleep(600) }
      if (!hasRows()) { await fillAndSubmit(); await sleep(800) }
      return hasRows()
    }, article, brand)
    if (!ensured) {
      // as a last resort, small wait
      await sleep(600)
    }
  } catch {}
}

// removed heavy DOM stabilization to avoid long stalls

async function scrapeTop3Prices(
  page: Page,
  brand: string,
  article?: string
): Promise<number[]> {
  try {
    const prices = await page.evaluate(
      (brandUpper: string, art?: string) => {
        // Collect candidate documents: main + same-origin iframes
        const getDocs = (): Document[] => {
          const docs: Document[] = [document];
          const ifr = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
          for (const f of ifr) {
            try {
              const d = f.contentDocument as Document | null;
              if (d) docs.push(d);
            } catch {}
          }
          return docs;
        };
        const norm = (s: string) =>
          (s || "").replace(/[^0-9a-zA-Zа-яА-Я]+/g, "").toUpperCase();
        const isCurrencyLike = (txt: string) =>
          /(руб|₽|\br\.|\bр\b)/i.test(txt);
        const looksNonPrice = (txt: string) =>
          /(шт\.|штук|штуки|дн\.|дней|день|предлож|налич|склад|шт\b|дн\b)/i.test(
            txt
          );
        const parsePrice = (raw?: string | null) => {
          const txt = (raw || "").trim();
          if (!txt || looksNonPrice(txt)) return null;
          const m = txt.match(/\d[\d\s.,]*/);
          if (!m) return null;
          const cleaned = m[0]
            .replace(/[^0-9.,]/g, "")
            .replace(/\s+/g, "")
            .replace(",", ".");
          const n = parseFloat(cleaned);
          if (!Number.isFinite(n)) return null;
          // Prefer currency-tagged texts; otherwise require a sane minimal value to avoid picking counts like "24"
          if (!isCurrencyLike(txt) && n < 500) return null;
          return n;
        };
        const parseAny = (raw?: string | null) => {
          const txt = (raw || '').trim();
          const m = txt.match(/\d[\d\s.,]*/);
          if (!m) return null;
          const cleaned = m[0].replace(/[^0-9.,]/g, '').replace(/\s+/g, '').replace(',', '.');
          const n = parseFloat(cleaned);
          return Number.isFinite(n) ? n : null;
        };
        const wantBrand = (brandUpper || "").trim().toUpperCase();
        const wantArt = art ? norm(art) : "";
        // Collect all data rows across documents (we will conditionally skip row 0 depending on context)
        const allRows: HTMLTableRowElement[] = [];
        for (const d of getDocs()) {
          const r1 = Array.from(d.querySelectorAll('tr[id*="SearchGridView_DXDataRow"], tr[id*="GridView_DXDataRow"]')) as HTMLTableRowElement[];
          allRows.push(...r1);
        }
        const pickFromRows = (rows: HTMLTableRowElement[]) => {
          const out: number[] = [];
          for (const tr of rows) {
            // Try common price locations inside row, with broader fallbacks
            const texts: string[] = [];
            const candidates: { txt: string; inPriceCell: boolean; trusted: boolean }[] = [];

            // Known classes/attributes
            const known = [
              // DevExpress/ZZAP price spans (from user hint)
              'span.dxeBase_ZZapAqua.f14b.dx-nowrap',
              'span[class*="dxeBase_ZZap" i].dx-nowrap',
              'td[align="right" i] span[class*="dxeBase_ZZap" i].dx-nowrap',
              // Avoid generic dx-nowrap globally (too noisy)
              // Legacy/other classes
              "td.pricewhitecell",
              "td .pricewhitecell",
              'td[class*="price" i]',
              ".price",
              ".cena",
              ".cost",
              // Restrict generic spans to price containers only (handled via inPriceCell)
            ];
            for (const sel of known) {
              const els = Array.from(tr.querySelectorAll(sel)) as HTMLElement[];
              for (const el of els) {
                const txt = (el.innerText || el.textContent || "").trim();
                if (!txt) continue;
                const td = el.closest("td") as HTMLElement | null;
                const trusted = /\bdxeBase_ZZap/i.test(el.className) && /\bdx-nowrap\b/i.test(el.className);
                const inPriceCell = trusted || (!!td && /price/i.test(td.className));
                candidates.push({ txt, inPriceCell, trusted });
              }
            }

            // Right-aligned numeric cell
            const rightAligned = tr.querySelector(
              'td[align="right" i]'
            ) as HTMLElement | null;
            if (rightAligned) {
              const txt = (rightAligned.innerText || "").trim();
              if (txt)
                candidates.push({
                  txt,
                  inPriceCell: /price/i.test(rightAligned.className),
                  trusted: false,
                });
            }

            // Last cells are often price columns
            const tds = Array.from(tr.querySelectorAll("td")) as HTMLElement[];
            if (tds.length) {
              const last = tds[tds.length - 1];
              const prev = tds[tds.length - 2];
              if (last) {
                const t = (last.innerText || "").trim();
                if (t)
                  candidates.push({
                    txt: t,
                    inPriceCell: /price/i.test(last.className),
                    trusted: false,
                  });
              }
              if (prev) {
                const t = (prev.innerText || "").trim();
                if (t)
                  candidates.push({
                    txt: t,
                    inPriceCell: /price/i.test(prev.className),
                    trusted: false,
                  });
              }
            }

            // As a last resort – any number with currency hint
            const rowText = (tr.innerText || "").trim();
            if (/руб|₽|р\.|р\s/i.test(rowText))
              candidates.push({ txt: rowText, inPriceCell: false, trusted: false });

            // Parse the first good looking price
            let picked: number | null = null;
            const parseAny = (raw?: string | null) => {
              const txt = (raw || '').trim();
              const m = txt.match(/\d[\d\s.,]*/);
              if (!m) return null;
              const cleaned = m[0].replace(/[^0-9.,]/g, '').replace(/\s+/g, '').replace(',', '.');
              const n = parseFloat(cleaned);
              return Number.isFinite(n) ? n : null;
            };
            for (const c of candidates) {
              let n = parsePrice(c.txt);
              if (n == null && c.trusted) n = parseAny(c.txt); // allow prices without currency if trusted span
              // Accept if currency, or in price cell, or trusted ZZAP price span
              if (n != null && n > 0) {
                const cur = /(руб|₽|\br\.|\bр\b)/i.test(c.txt);
                if (cur || c.inPriceCell || c.trusted) {
                  picked = n;
                  break;
                }
              }
            }

            if (picked != null) out.push(picked);
            // stop after collecting three prices
            if (out.length >= 3) break;
          }
          // Return first up to 3 prices as-is (не скипаем первое)
          if (out.length >= 3) return out.slice(0, 3);
          return out.slice(0, 3);
        };

        // 1) Brand + Article filter
        let rows = allRows.filter((tr) => {
          const text = (tr.innerText || "").toUpperCase();
          if (wantBrand && !text.includes(wantBrand)) return false;
          if (wantArt && !norm(text).includes(wantArt)) return false;
          return true;
        });
        let out = pickFromRows(rows);
        if (out.length >= 3) return out.slice(0, 3);

        // 2) Brand only
        if (wantBrand) {
          rows = allRows.filter((tr) =>
            (tr.innerText || "").toUpperCase().includes(wantBrand)
          );
          out = pickFromRows(rows);
          if (out.length >= 3) return out.slice(0, 3);
        }

        // 3) Any first rows as fallback
        const fallbackRows = allRows;
        out = pickFromRows(fallbackRows);
        if (out.length >= 3) return out.slice(0, 3);

        // 4) Global scan across the page (some layouts render price blocks outside rows)
        const globalSelectors = [
          "td.pricewhitecell",
          'td[class*="price" i]',
          'span[class*="dxeBase_ZZap" i].dx-nowrap',
          'div[class*="price" i]',
        ];
        const candTexts: { txt: string; inPriceCell: boolean; trusted: boolean }[] = [];
        for (const d of getDocs()) {
          for (const sel of globalSelectors) {
            const els = Array.from(d.querySelectorAll(sel)) as HTMLElement[];
            for (const el of els) {
              const txt = (el.innerText || el.textContent || "").trim();
              if (!txt) continue;
              const td = el.closest("td") as HTMLElement | null;
              const trusted = /\bdxeBase_ZZap/i.test(el.className) && /\bdx-nowrap\b/i.test(el.className);
              const inPriceCell = trusted || (!!td && /price/i.test(td.className));
              candTexts.push({ txt, inPriceCell, trusted });
            }
          }
        }
        // Parse in DOM order, prefer currency-tagged, then trusted spans, preserve encounter order
        const parsedDOM: { n: number; cur: boolean; trusted: boolean }[] = [];
        for (const c of candTexts) {
          let n = parsePrice(c.txt);
          if (n == null && c.trusted) n = parseAny(c.txt);
          if (n != null && n > 0) {
            const cur = isCurrencyLike(c.txt);
            if (cur || c.inPriceCell || c.trusted) parsedDOM.push({ n, cur, trusted: c.trusted });
          }
        }
        const currency = parsedDOM.filter((p) => p.cur);
        const trustedOnly = parsedDOM.filter((p) => !p.cur && p.trusted);
        const rest = parsedDOM.filter((p) => !p.cur && !p.trusted);
        const combined = [...currency, ...trustedOnly, ...rest];
        const seen = new Set<number>();
        const ordered: number[] = [];
        for (const p of combined) {
          if (!seen.has(p.n)) {
            seen.add(p.n);
            ordered.push(p.n);
          }
        }
        if (ordered.length >= 3) return ordered.slice(0, 3);
        return ordered.slice(0, 3);
      },
      brand.toUpperCase(),
      article
    );
    return prices || [];
  } catch {
    return [];
  }
}

// Extract prices directly from DevExpress DX callback payloads captured from POST /public/search.aspx
function parsePricesFromDxPayload(payload: string): number[] {
  const out: number[] = []
  const parseAny = (raw?: string | null) => {
    const txt = (raw || '').trim()
    const m = txt.match(/\d[\d\s.,]*/)
    if (!m) return null
    const cleaned = m[0].replace(/[^0-9.,]/g, '').replace(/\s+/g, '').replace(',', '.')
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }
  try {
    // If wrapped as /*DX*/({...}) – unwrap
    const m0 = payload.match(/\/\*DX\*\/\((\{[\s\S]*?\})\)/)
    const src = m0 && m0[1] ? m0[1] : payload
    // 1) Жёстко парсим целевые спаны ZZAP в порядке появления
    const spanRe = /<span[^>]*class="[^"]*dxeBase_ZZap[^"]*dx-nowrap[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    let m: RegExpExecArray | null
    while ((m = spanRe.exec(src))) {
      const n = parseAny(m[1])
      if (n != null && n > 0) {
        out.push(n)
        if (out.length >= 3) return out.slice(0, 3)
      }
    }
    // 2) Фолбэк: если нужных спанов мало — вытащим числа с валютой
    if (out.length < 3) {
      const withCur = Array.from(src.matchAll(/(?:руб|₽|\br\.|\bр\b)[^\d]*([\d\s.,]{3,})/gi)).map(x => x[1])
      for (const raw of withCur) {
        const n = parseAny(raw)
        if (n != null && n > 0) {
          out.push(n)
          if (out.length >= 3) break
        }
      }
    }
  } catch {}
  return out.slice(0, 3)
}

async function captureTop3PricesFromDX(page: Page, article: string, brand?: string): Promise<number[]> {
  const captured: string[] = []
  let lastAt = 0
  const wantHost = new URL(ZZAP_BASE).host
  const isTarget = (u: string) => {
    try { const x = new URL(u); return x.host === wantHost && /\/public\/search\.aspx/i.test(x.pathname) } catch { return /public\/search\.aspx/i.test(u) }
  }
  const onResp = async (resp: any) => {
    try {
      const url = typeof resp.url === 'function' ? resp.url() : resp.url
      if (!isTarget(url)) return
      const ct = (await resp.headers?.())?.['content-type'] || resp.headers?.()['content-type'] || ''
      if (ct && !/text\/plain/i.test(ct)) return
      const txt = await resp.text().catch(() => '')
      if (txt && /\/\*DX\*\//.test(txt)) { captured.push(txt); lastAt = Date.now() }
    } catch {}
  }
  const onFinished = async (req: any) => {
    try {
      const url = typeof req.url === 'function' ? req.url() : req.url
      if (!isTarget(url)) return
      const r = await (req.response?.() || null)
      if (!r) return
      const ct = (await r.headers?.())?.['content-type'] || r.headers?.()['content-type'] || ''
      if (ct && !/text\/plain/i.test(ct)) return
      const txt = await r.text().catch(() => '')
      if (txt && /\/\*DX\*\//.test(txt)) { captured.push(txt); lastAt = Date.now() }
    } catch {}
  }
  page.on('response', onResp)
  page.on('requestfinished', onFinished as any)
  try {
    // Give time for the page to issue callbacks after search open
    const maxDeadline = Date.now() + Math.max(ZZAP_DX_MAX_WAIT_MS, 12000)
    // initial settle
    await sleep(800)
    while (Date.now() < maxDeadline) {
      // If we have something, wait for idle
      if (captured.length > 0) {
        const idle = Math.max(600, ZZAP_DX_IDLE_MS)
        const start = lastAt
        while (Date.now() - lastAt < idle && Date.now() < maxDeadline) {
          await sleep(150)
          if (lastAt !== start) continue
        }
        break
      }
      await sleep(200)
    }
  } catch {}
  try { page.off?.('response', onResp); page.off?.('requestfinished', onFinished as any) } catch {}
  // Merge and parse
  const merged = captured.join('\n\n')
  const prices = parsePricesFromDxPayload(merged)
  // As a light brand/article filter: if brand provided, keep as-is (we can't map rows), else just return
  return prices.slice(0, 3)
}

async function openStats(page: Page): Promise<Page> {
  try {
    // Prefer explicit DevExpress stat hyperlink with onclick
    const rel = await page.evaluate(() => {
      const links = Array.from(
        document.querySelectorAll("a")
      ) as HTMLAnchorElement[];
      for (const a of links) {
        const href = (a.getAttribute("href") || a.href || "").toString();
        const onclick = (a.getAttribute("onclick") || "").toString();
        const rx = /['\"]([^'\"]*statpartpricehistory\.aspx[^'\"]*)['\"]/i;
        const m = onclick.match(rx);
        if (m && m[1]) return m[1].replace(/&amp;/g, "&");
        if (/statpartpricehistory\.aspx/i.test(href))
          return href.replace(/&amp;/g, "&");
      }
      // Try any element with inline onclick/text containing target URL
      const any = document.querySelectorAll("[onclick], *");
      for (const el of Array.from(any)) {
        const oc = (el as HTMLElement).getAttribute?.("onclick") || "";
        const txt = (el as HTMLElement).textContent || "";
        const rx = /user\/statpartpricehistory\.aspx[^'\"]*/i;
        const m1 = oc.match(rx) || txt.match(rx);
        if (m1 && m1[0]) return m1[0].replace(/&amp;/g, "&");
      }
      // Bruteforce search through raw HTML as last resort
      try {
        const html = document.documentElement?.innerHTML || "";
        const m = html.match(/user\/statpartpricehistory\.aspx[^'\"<> ]*/i);
        if (m && m[0]) return m[0].replace(/&amp;/g, "&");
      } catch {}
      return null as string | null;
    });
    if (rel) {
      const statsUrl = rel.startsWith("http") ? rel : `${ZZAP_BASE}${rel}`;
      await page.goto(statsUrl, {
        waitUntil: "domcontentloaded",
        timeout: Math.min(12000, ZZAP_TIMEOUT_MS),
      });
      return page;
    }
  } catch {}
  return page;
}

function parseDxPayloadToPoints(payload: string): { label: string; count: number }[] {
  try {
    // Accept either full /*DX*/({...}) or inner objectModel string
    let src = payload
    const m0 = payload.match(/\/\*DX\*\/\((\{[\s\S]*?\})\)/)
    if (m0 && m0[1]) src = m0[1]
  } catch {}
  const out: { label: string; count: number }[] = []
  try {
    const rxPoint = /x:\s*new\s+Date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*1\s*\)[^\]]*?y:\s*\[(\d+)\]/g
    let m: RegExpExecArray | null
    while ((m = rxPoint.exec(payload))) {
      const yy = parseInt(m[1], 10)
      const mm = parseInt(m[2], 10)
      const val = parseInt(m[3], 10)
      const d = new Date(yy, mm, 1)
      out.push({ label: labelFor(d), count: Number.isFinite(val) ? val : 0 })
    }
  } catch {}
  return out
}

async function captureDxFromSearch(page: Page, jobId: string, article: string): Promise<{ label: string; count: number }[] | null> {
  // Attach listeners on the search page, trigger the popup link, capture response body
  const captured: string[] = []
  let lastDxAt = 0
  const respHandler = async (resp: any) => {
    try {
      const u = (typeof resp.url === 'function' ? resp.url() : resp.url) || ''
      if (!/statpartpricehistory\.aspx/i.test(u)) return
      const txt = await resp.text().catch(() => '')
      if (txt && txt.includes('/*DX*/')) { captured.push(txt); lastDxAt = Date.now() }
    } catch {}
  }
  const finishedHandler = async (req: any) => {
    try {
      const u = (typeof req.url === 'function' ? req.url() : req.url) || ''
      if (!/statpartpricehistory\.aspx/i.test(u)) return
      const r = await (req.response?.() || null)
      if (!r) return
      const txt = await r.text().catch(() => '')
      if (txt && txt.includes('/*DX*/')) { captured.push(txt); lastDxAt = Date.now() }
    } catch {}
  }
  page.on('response', respHandler)
  page.on('requestfinished', finishedHandler as any)
  try {
    await debugShot(page, jobId, `stats-before-click-${encodeURIComponent(article)}`)
    // Click the in-page "Статистика" link (ShowPopup)
    await page.evaluate(() => {
      const find = () => {
        const all = Array.from(document.querySelectorAll('a,button,span,div')) as HTMLElement[]
        for (const el of all) {
          const oc = (el.getAttribute('onclick') || '').toString()
          if (/statpartpricehistory\.aspx/i.test(oc)) return el
        }
        const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]
        for (const a of links) {
          const oc = (a.getAttribute('onclick') || '').toString()
          const href = (a.getAttribute('href') || a.href || '').toString()
          if (/statpartpricehistory\.aspx/i.test(oc) || /statpartpricehistory\.aspx/i.test(href)) return a as any
        }
        return null
      }
      const el = find()
      if (el) (el as HTMLElement).click()
    })
    // Small settle for JS popup to fire request
    await sleep(500)
    await debugShot(page, jobId, `stats-after-click-${encodeURIComponent(article)}`)
    // Wait for first DX response up to max wait
    const maxDeadline = Date.now() + Math.max(ZZAP_DX_MAX_WAIT_MS, 10000)
    while (captured.length === 0 && Date.now() < maxDeadline) { await sleep(200) }
    // Debounce: if we saw something, wait until no new responses for idle window
    if (captured.length > 0) {
      let last = lastDxAt
      const idle = Math.max(600, ZZAP_DX_IDLE_MS)
      while (Date.now() - last < idle && Date.now() < maxDeadline) {
        await sleep(200)
        if (lastDxAt !== last) last = lastDxAt
      }
    }
  } catch {}
  try {
    page.off?.('response', respHandler)
    page.off?.('requestfinished', finishedHandler as any)
  } catch {}
  if (captured.length === 0) return null
  // Prefer payload that mentions requests/search (3rd chart); fallback to last
  const chosen = pickPreferredDxPayload(captured, jobId)
  const pts = parseDxPayloadToPoints(chosen)
  try { appendJobLog(jobId, `dx: captured labels=${pts.length}`) } catch {}
  return pts
}

async function scrapeMonthlyCounts(
  statsPage: Page,
  monthLabels: string[]
): Promise<{ label: string; count: number }[]> {
  try {
    // 1) Попытка прочитать данные напрямую из Highcharts
    const data = await statsPage.evaluate((wanted: string[]) => {
      const res: { label: string; count: number }[] = [];
      const w = window as any;
      const charts = (w.Highcharts?.charts || []).filter(
        (c: any) => c && c.series && c.xAxis
      );
      const rxReq = /запрос|поиск|просмотр/i;
      for (const ch of charts) {
        try {
          const cats: string[] = ch.xAxis?.[0]?.categories || [];
          if (!cats?.length) continue;
          // выбрать серию, похожую на "запросы"
          let targetSeries: any = null;
          for (const s of ch.series || []) {
            const n = (s?.name || "").toString();
            if (rxReq.test(n)) {
              targetSeries = s;
              break;
            }
          }
          if (!targetSeries && ch.series?.length === 1)
            targetSeries = ch.series[0];
          const series = targetSeries?.data || [];
          if (series?.length) {
            for (let i = 0; i < Math.min(cats.length, series.length); i++) {
              const y =
                typeof series[i] === "number" ? series[i] : series[i]?.y ?? 0;
              const label = String(cats[i]);
              res.push({ label, count: Number(y) || 0 });
            }
            // не прерываем, но приоритет у первой подходящей
            break;
          }
        } catch {}
      }
      if (res.length) return res;
      return [];
    }, monthLabels);
    if (data?.length) return data;

    // 2) Фолбэк: по таблице
    const table = await statsPage.evaluate(() => {
      const out: { label: string; count: number }[] = [];
      const rows = Array.from(document.querySelectorAll("table tr"));
      for (const tr of rows) {
        const tds = Array.from(tr.querySelectorAll("td")).map((td) =>
          (td.textContent || "").trim()
        );
        if (
          tds.length >= 2 &&
          /\d{4}|янв|фев|мар|апр|ма[йя]|июн|июл|авг|сен|окт|ноя|дек/i.test(
            tds[0]
          )
        ) {
          const n = parseInt(tds[1].replace(/[^0-9]/g, ""), 10);
          if (!isNaN(n)) out.push({ label: tds[0], count: n });
        }
      }
      return out;
    });
    return table || [];
  } catch {
    return [];
  }
}

async function fetchDxMonthly(
  statsPage: Page,
  jobId?: string,
  statsUrl?: string | null
): Promise<{ label: string; count: number }[] | null> {
  // Capture DevExpress callback payload with chart data
  let payload: string | null = null;
  const dxPayloads: string[] = [];
  let lastDxAt = 0;
  const handler = async (resp: any) => {
    try {
      const u = (typeof resp.url === 'function' ? resp.url() : resp.url) || ''
      if (!/statpartpricehistory\.aspx/i.test(u)) return;
      const status = typeof resp.status === 'function' ? resp.status() : undefined
      const headers = typeof resp.headers === 'function' ? resp.headers() : {}
      const ct = (headers && (headers['content-type'] || headers['Content-Type'])) || ''
      if (jobId) appendJobLog(jobId, `dx: resp ${status || ''} ct=${String(ct)} url=${u}`)
      try {
        const txt = await resp.text().catch(() => "");
        if (txt && txt.includes("/*DX*/")) {
          dxPayloads.push(txt);
          payload = txt;
          lastDxAt = Date.now();
        }
      } catch {}
    } catch {}
  };
  statsPage.on("response", handler);
  const onFinished = async (req: any) => {
    try {
      const u = (typeof req.url === 'function' ? req.url() : req.url) || ''
      if (!/statpartpricehistory\.aspx/i.test(u)) return
      const resp = await (req.response?.() || null)
      if (!resp) return
      const txt = await resp.text().catch(()=>"")
      if (txt && txt.includes('/*DX*/')) {
        dxPayloads.push(txt);
        payload = txt;
        lastDxAt = Date.now();
      }
    } catch {}
  }
  statsPage.on('requestfinished', onFinished as any)
  try {
    try { if (jobId) appendJobLog(jobId, `dx: entry url=${statsPage.url?.() || ''}`) } catch {}
    // If a direct stats URL is provided, navigate after attaching handler
    if (statsUrl) {
      try {
        // Restore cookies into this tab to avoid redirect to logon
        try { await (restoreSession as any)(statsPage) } catch {}
        await statsPage.goto(statsUrl, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(()=>{})
        // Give redirects time to settle
        await new Promise((r) => setTimeout(r, 400))
      } catch {}
    }
    // Ensure we are authenticated in this tab
    try {
      const ok = await (async () => {
        try { return await (ensureAuthenticated as any)(statsPage) } catch { return false }
      })()
      if (!ok && jobId) appendJobLog(jobId, 'dx: ensureAuthenticated=false')
    } catch {}
    // If redirected to login — try to login right here (uses same cookies scope)
    let urlNow = statsPage.url?.() || "";
    if (/\/sys\/captcha\.aspx/i.test(urlNow)) {
      if (jobId)
        appendJobLog(jobId, "captcha detected before DX, skip capture");
      return null;
    }
    if (/\/user\/logon\.aspx/i.test(urlNow)) {
      const email = process.env.ZZAP_EMAIL || "";
      const password = process.env.ZZAP_PASSWORD || "";
      try {
        if (jobId)
          appendJobLog(jobId, "dx: on logon.aspx, trying inline login");
        await debugShot(statsPage as any, jobId!, 'dx-logon')
        // Fill inputs
        const emailSel =
          '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_AddrEmail1TextBox_I, input[type="email"]';
        const passSel =
          '#ctl00_BodyPlace_LogonFormCallbackPanel_LogonFormLayout_PasswordTextBox_I, input[type="password"]';
        await statsPage.type(emailSel, email, { delay: 10 }).catch(() => {});
        await statsPage.type(passSel, password, { delay: 10 }).catch(() => {});
        // Press Enter
        await Promise.all([
          statsPage
            .waitForNavigation({
              waitUntil: "domcontentloaded",
              timeout: 12000,
            })
            .catch(() => {}),
          (async () => {
            try {
              await statsPage.keyboard.press("Enter");
            } catch {}
          })(),
        ]);
        // Follow backurl explicitly if still not stats
        try {
          // refresh current URL, it could change after Enter
          urlNow = statsPage.url?.() || urlNow;
          const u = new URL(urlNow);
          const back = u.searchParams.get("backurl");
          if (back) {
            const target = decodeURIComponent(back);
            if (jobId) appendJobLog(jobId, `dx: goto backurl ${target}`);
            await statsPage
              .goto(target, { waitUntil: "domcontentloaded", timeout: 12000 })
              .catch(() => {});
            await new Promise((r) => setTimeout(r, 400))
            await debugShot(statsPage as any, jobId!, 'dx-after-login')
          }
        } catch {}
      } catch {}
    }
    // From search page, try to locate stats link and navigate here in the same tab
    try {
      const curUrl = statsPage.url?.() || "";
      if (/\/sys\/captcha\.aspx/i.test(curUrl)) {
        if (jobId)
          appendJobLog(
            jobId,
            "captcha detected on search page, skip navigation"
          );
        return null;
      }
      const rel = await statsPage.evaluate(() => {
        const links = Array.from(
          document.querySelectorAll("a")
        ) as HTMLAnchorElement[];
        for (const a of links) {
          const href = (a.getAttribute("href") || a.href || "").toString();
          const onclick = (a.getAttribute("onclick") || "").toString();
          const rx = /['\"]([^'\"]*statpartpricehistory\.aspx[^'\"]*)['\"]/i;
          const m = onclick.match(rx);
          if (m && m[1]) return m[1].replace(/&amp;/g, "&");
          if (/statpartpricehistory\.aspx/i.test(href))
            return href.replace(/&amp;/g, "&");
        }
        return null as string | null;
      });
      if (rel) {
        const statsUrl = rel.startsWith("http") ? rel : `${ZZAP_BASE}${rel}`;
        if (jobId) appendJobLog(jobId, `dx: navigate stats ${statsUrl}`);
        await statsPage
          .goto(statsUrl, { waitUntil: "domcontentloaded", timeout: 20000 })
          .catch(() => {});
        // Wait for DX response after navigation
        try {
          const resp = await statsPage.waitForResponse(
            (r: any) => {
              try {
                const uu = (typeof r.url === 'function' ? r.url() : r.url) || ''
                return /statpartpricehistory\.aspx/i.test(uu)
              } catch {
                return false;
              }
            },
            { timeout: 15000 }
          );
          const txt = await resp.text().catch(() => "");
          if (txt && txt.includes("/*DX*/")) {
            payload = txt;
          }
        } catch {}
      }
    } catch {}
    // If already on stats page, force a reload to trigger DX callback and capture it
    try {
      const here = statsPage.url?.() || "";
      if (/statpartpricehistory\.aspx/i.test(here)) {
      await statsPage
        .reload({ waitUntil: "domcontentloaded", timeout: 20000 })
        .catch(() => {});
      try {
          const resp = await statsPage.waitForResponse(
            (r: any) => {
              try {
                const uu = (typeof r.url === 'function' ? r.url() : r.url) || ''
                return /statpartpricehistory\.aspx/i.test(uu)
              } catch {
                return false;
              }
            },
            { timeout: 15000 }
          );
          const txt = await resp.text().catch(() => "");
          if (txt && txt.includes("/*DX*/")) {
            payload = txt;
          }
        } catch {}

        // As an extra nudge, try to invoke DevExpress/ASP.NET postback for the chart control
        if (!payload) {
          try {
            await statsPage.evaluate(() => {
              try {
                const w: any = window as any;
                if (typeof w.__doPostBack === 'function') {
                  // Guess common chart control IDs used on ZZAP
                  const candidates = [
                    'ctl00$BodyPlace$QueryWebChartControl',
                    'ctl00$BodyPlace$WebChartControl',
                    'ctl00$BodyPlace$Chart',
                  ];
                  for (const id of candidates) {
                    try { w.__doPostBack(id, ''); } catch {}
                  }
                }
              } catch {}
            });
            // Wait for any DX response after forced postback
            try {
              const resp2 = await statsPage.waitForResponse(
                (r: any) => {
                  try {
                    const uu = (typeof r.url === 'function' ? r.url() : r.url) || ''
                    return /statpartpricehistory\.aspx/i.test(uu)
                  } catch { return false }
                },
                { timeout: 15000 }
              );
              const txt2 = await resp2.text().catch(()=>"");
              if (txt2 && txt2.includes('/*DX*/')) payload = txt2;
            } catch {}
          } catch {}
        }
        await debugShot(statsPage as any, jobId!, 'dx-after-postback')
      }
    } catch {}
    // Try accept cookie banners which can block scripts
    try {
      await statsPage.evaluate(() => {
        const labels = ["соглас", "принять", "хорошо"];
        const nodes = Array.from(
          document.querySelectorAll(
            'button, a, div, span, input[type="button"], input[type="submit"]'
          )
        ) as HTMLElement[];
        for (const el of nodes) {
          const t = (el.innerText || el.textContent || "").trim().toLowerCase();
          if (!t) continue;
          if (labels.some((l) => t.includes(l))) {
            try {
              (el as HTMLElement).click();
            } catch {}
          }
        }
      });
    } catch {}
  } catch {}
  // (Gentle mode) No direct POST fallback
  try {
    statsPage.off?.("response", handler as any);
    statsPage.off?.('requestfinished', onFinished as any)
  } catch {}
  // Debounce window: if we captured something, wait briefly for trailing final payload
  try {
    const start = Date.now()
    const idle = Math.max(600, ZZAP_DX_IDLE_MS)
    const maxWait = Math.max(5000, ZZAP_DX_MAX_WAIT_MS)
    if (!payload) {
      // wait up to max for first payload
      while (!payload && Date.now() - start < maxWait) { await sleep(200) }
    }
    if (payload) {
      let last = lastDxAt || start
      while (Date.now() - last < idle && Date.now() - start < maxWait) {
        await sleep(200)
        if (lastDxAt !== last) last = lastDxAt
      }
      if (jobId) appendJobLog(jobId, `dx: idle done age=${Date.now() - last}ms`)
    }
  } catch {}
  if (!payload) {
    // Last-chance: try to extract objectModel from current HTML
    try {
      const htmlBlob = await statsPage.evaluate(() => document.documentElement?.innerHTML || '')
      let found: string | null = null
      // 1) Full DX blob
      const m1 = htmlBlob.match(/\/\*DX\*\/\((\{[\s\S]*?\})\)/)
      if (m1 && m1[1]) found = m1[1]
      // 2) objectModel only
      if (!found) {
        const m2 = htmlBlob.match(/objectModel'\s*:\s*'([^']+)'/)
        if (m2 && m2[1]) found = m2[1]
      }
      if (found) {
        payload = found
        try { if (jobId) appendJobLog(jobId, `dx: html objectModel len=${found.length}`) } catch {}
      }
    } catch {}
    if (!payload) {
      try { if (jobId) appendJobLog(jobId, 'dx: no DX payload captured') } catch {}
      return null;
    }
  }
  try { if (jobId) appendJobLog(jobId, `dx: payload captured len=${payload.length} count=${dxPayloads.length}`) } catch {}
  // If multiple DX payloads were seen, pick preferred one (requests chart)
  if (dxPayloads.length > 1) {
    const chosen = pickPreferredDxPayload(dxPayloads, jobId)
    payload = chosen
  }
  // Parse individual points: x:new Date(YYYY,MM,1) ... y:[N]
  const out: { label: string; count: number }[] = [];
  try {
    const rxPoint =
      /x:\s*new\s+Date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*1\s*\)[^\]]*?y:\s*\[(\d+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = rxPoint.exec(payload!))) {
      const yy = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10); // 0-based
      const val = parseInt(m[3], 10);
      const d = new Date(yy, mm, 1);
      out.push({ label: labelFor(d), count: Number.isFinite(val) ? val : 0 });
    }
  } catch {}
  if (!out.length) return null;
  return out;
}

function* eachMonth(from: Date, to: Date): Generator<Date> {
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  while (d <= to) {
    yield new Date(d);
    d.setMonth(d.getMonth() + 1);
  }
}

const ruGenitive = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
function labelFor(d: Date) {
  return `${ruGenitive[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

function pickPreferredDxPayload(payloads: string[], jobId?: string): string {
  // Prefer payload mentioning requests/search/views over offers
  // rxReq matches Russian words like запрос/поиск/просмотр (case-insensitive)
  const rxReq = /(запрос|поиск|просмотр)/i;
  const rxOffer = /(предложен)/i; // de-prioritize offers
  let candidateIndex = -1;
  // scan from end to start to prefer later payloads
  for (let i = payloads.length - 1; i >= 0; i--) {
    const p = payloads[i] || '';
    if (rxReq.test(p)) { candidateIndex = i; break; }
  }
  if (candidateIndex === -1) {
    // if nothing matches request keywords, try to avoid offers
    for (let i = payloads.length - 1; i >= 0; i--) {
      const p = payloads[i] || '';
      if (!rxOffer.test(p)) { candidateIndex = i; break; }
    }
  }
  if (candidateIndex === -1) candidateIndex = payloads.length - 1; // fallback to last
  try { if (jobId) appendJobLog(jobId, `dx: pick payload index=${candidateIndex}/${payloads.length}`) } catch {}
  return payloads[Math.max(0, candidateIndex)] || payloads[payloads.length - 1];
}

function toLabelFromCompact(s: string): string | null {
  // Convert strings like 01.21 or 1.2024 into labelFor format
  const m1 = s.match(/^(\d{1,2})[./-](\d{2,4})$/);
  if (m1) {
    const mm = Math.max(1, Math.min(12, parseInt(m1[1], 10)));
    let yy = parseInt(m1[2], 10);
    if (m1[2].length === 2) yy += 2000;
    const d = new Date(yy, mm - 1, 1);
    if (!isNaN(+d)) return labelFor(d);
  }
  // Try Russian month names already
  const rx =
    /(янв|фев|мар|апр|ма[йя]|июн|июл|авг|сен|окт|ноя|дек)[^0-9]*([0-9]{2,4})/i;
  if (rx.test(s)) {
    const m2 = s.match(rx)!;
    const map: Record<string, number> = {
      янв: 0,
      фев: 1,
      мар: 2,
      апр: 3,
      май: 4,
      мая: 4,
      июн: 5,
      июл: 6,
      авг: 7,
      сен: 8,
      окт: 9,
      ноя: 10,
      дек: 11,
    };
    const mm = map[m2[1].toLowerCase()] ?? 0;
    let yy = parseInt(m2[2], 10);
    if (m2[2].length === 2) yy += 2000;
    const d = new Date(yy, mm, 1);
    if (!isNaN(+d)) return labelFor(d);
  }
  return null;
}

function getJobLogPath(id: string) {
  return path.join(RUNTIME_DIR, `.zzap-report-${id}.log`);
}

function appendJobLog(id: string, line: string) {
  try {
    const p = getJobLogPath(id);
    const ts = new Date().toISOString().replace("T", " ").replace("Z", "");
    fs.appendFileSync(p, `[${ts}] ${line}\n`);
  } catch {}
  // Best-effort: also persist to DB for environments without writable FS
  try {
    const ts = new Date().toISOString();
    const uid = randomUUID();
    const safeId = id.replace(/'/g, "''");
    const safeLine = line.replace(/'/g, "''");
    // Fire-and-forget; ignore errors
    // Create table if not exists
    (async () => {
      try {
        await (prisma as any).$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "zzap_report_job_logs" (
          id text primary key,
          "jobId" text not null,
          line text not null,
          "createdAt" timestamptz not null default now()
        )`)
        await (prisma as any).$executeRawUnsafe(`INSERT INTO "zzap_report_job_logs" (id, "jobId", line, "createdAt") VALUES ('${uid}', '${safeId}', '${safeLine}', '${ts}')`)
      } catch {}
    })().catch(() => null as any)
  } catch {}
}

async function debugShot(page: Page, jobId: string, tag: string) {
  if (!ZZAP_DEBUG_SHOTS) return null as string | null;
  try {
    const buf = (await (page as any).screenshot?.({ type: 'png', fullPage: true })) as Buffer
    if (!buf) return null
    const key = `zzap/debug/${encodeURIComponent(jobId)}/${Date.now()}-${tag}.png`
    const res = await uploadBuffer(buf, key, 'image/png').catch(() => null as any)
    const link = typeof res === 'string' ? res : (res?.url || res?.Location || key)
    if (link) appendJobLog(jobId, `debug: shot ${tag} -> ${link}`)
    return link
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  // If 'batch' specified, process that many; otherwise process all remaining (full batch)
  const batchSize = (() => {
    const b = parseInt(searchParams.get('batch') || '', 10)
    if (Number.isFinite(b) && b > 0) return Math.min(1000, b)
    return Number.MAX_SAFE_INTEGER
  })();
  if (!id)
    return new Response(JSON.stringify({ ok: false, error: "id required" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  // Load job via Prisma only
  const job: any = await (prisma as any).zzapReportJob.findUnique({
    where: { id },
  });
  if (!job)
    return new Response(JSON.stringify({ ok: false, error: "not found" }), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  if (job.status === "done")
    return new Response(
      JSON.stringify({
        ok: true,
        status: "done",
        processed: job.processed,
        total: job.total,
        resultFile: job.resultFile,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      }
    );
  if (job.status === "canceled" || job.status === "failed" || job.status === "error") {
    return new Response(
      JSON.stringify({
        ok: true,
        status: job.status,
        processed: job.processed,
        total: job.total,
        resultFile: job.resultFile,
        error: job.error,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      }
    );
  }

  // Concurrency guard: allow only one active processor
  // Fast-path: if job is already marked as running and it's NOT stale, just report status and exit
  try {
    const staleMs = Number(process.env.ZZAP_JOB_STALE_MS || 180000) // 3 minutes by default
    const updatedAt = new Date(job.updatedAt || job.createdAt || Date.now()) as any
    const ageMs = Math.max(0, Date.now() - new Date(updatedAt).getTime())
    const isStale = job.status === 'running' && ageMs > staleMs
    if (job.status === 'running' && !isStale) {
      return new Response(
        JSON.stringify({
          ok: true,
          status: 'running',
          processed: job.processed,
          total: job.total,
          resultFile: job.resultFile,
        }),
        { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } }
      )
    }
    // Try to atomically set status to 'running' if it isn't running yet
    if (job.status !== 'running') {
      const upd = await (prisma as any).zzapReportJob.updateMany({ where: { id, status: 'pending' }, data: { status: 'running' } })
      if (upd?.count > 0) {
        job.status = 'running'
      } else {
        const j2 = await (prisma as any).zzapReportJob.findUnique({ where: { id }, select: { status: true, processed: true, total: true, resultFile: true } })
        if (j2?.status === 'running') {
          return new Response(
            JSON.stringify({ ok: true, status: 'running', processed: j2.processed, total: j2.total, resultFile: j2.resultFile }),
            { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } }
          )
        }
      }
    } else if (isStale) {
      // Attempt to take over a stale 'running' job by bumping updatedAt via guarded updateMany
      try {
        const threshold = new Date(Date.now() - staleMs)
        const upd2 = await (prisma as any).zzapReportJob.updateMany({ where: { id, status: 'running', updatedAt: { lt: threshold } }, data: { status: 'running' } })
        if (upd2?.count > 0) {
          appendJobLog(id, `stale-runner detected (age=${ageMs}ms); taking over`)
        } else {
          // Someone else refreshed it; report running
          const j2 = await (prisma as any).zzapReportJob.findUnique({ where: { id }, select: { status: true, processed: true, total: true, resultFile: true } })
          return new Response(
            JSON.stringify({ ok: true, status: 'running', processed: j2?.processed ?? job.processed, total: j2?.total ?? job.total, resultFile: j2?.resultFile ?? job.resultFile }),
            { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } }
          )
        }
      } catch {}
    }
  } catch {}

  const rows = job.inputRows as any[] as { article: string; brand: string }[];
  const processed = job.processed;
  const toProcess = rows.slice(processed, processed + batchSize);
  let results = (job.results as any[]) || [];
  if (results.length !== rows.length)
    results = Array.from({ length: rows.length }).fill(null);

  // Ensure status is running (idempotent)
  try { await (prisma as any).zzapReportJob.update({ where: { id }, data: { status: 'running' } }) } catch {}
  try { appendJobLog(id, `processor: start batchSize=${batchSize}, processed=${processed}/${rows.length}`) } catch {}

  // Helper to call internal endpoints (AI, screenshot)
  const origin = (() => {
    try {
      const u = new URL(req.url);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "";
    }
  })();
  const callScreenshot = async (
    article: string,
    brand?: string
  ): Promise<{ imageUrl: string | null; statsUrl: string | null }> => {
    try {
      const qs = new URLSearchParams({ article });
      if (brand) qs.set("brand", brand);
      qs.set("debug", "1");
      const res = await fetch(
        `${origin}/api/zzap/screenshot?${qs.toString()}`,
        { method: "GET", headers: { accept: "application/json" } }
      );
      if (!res.ok) return { imageUrl: null, statsUrl: null };
      const j = await res.json().catch(() => null as any);
      const img = j?.imageUrl || null;
      const pageUrl = j?.url || null;
      const imageUrl =
        typeof img === "string" && img.startsWith("http") ? img : null;
      const statsUrl =
        typeof pageUrl === "string" &&
        /statpartpricehistory\.aspx/i.test(pageUrl)
          ? pageUrl
          : null;
      return { imageUrl, statsUrl };
    } catch {
      return { imageUrl: null, statsUrl: null };
    }
  };
  const callVisionAI = async (
    imageUrl: string,
    monthLabels: string[]
  ): Promise<{
    summary: string | null;
    stats: Record<string, number> | null;
  }> => {
    try {
      const modelOverride =
        (process.env.ZZAP_VISION_MODEL || "").trim() || undefined;
      const sys = {
        role: "system",
        content:
          "Верни строго JSON без пояснений, извлекая данные из картинки.",
      };
      const prompt = `На изображении график статистики ZZAP. Верни строго JSON вида {"summary":"…","stats":{}}. В stats используй только эти метки: ${monthLabels.join(
        ", "
      )}. Если число не видно — 0.`;
      const user = {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      } as any;
      const res = await fetch(`${origin}/api/ai/chat`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/plain" },
        body: JSON.stringify({
          messages: [sys, user],
          stream: false,
          temperature: 0.1,
          ...(modelOverride ? { model: modelOverride } : {}),
        }),
      });
      const text = await res.text().catch(() => "");
      if (!res.ok) return { summary: null, stats: null };
      let summary: string | null = null;
      let stats: Record<string, number> | null = null;
      try {
        const j = JSON.parse(text);
        if (j && typeof j === "object") {
          summary = typeof j.summary === "string" ? j.summary : null;
          if (j.stats && typeof j.stats === "object") {
            stats = {};
            for (const k of monthLabels) {
              const v = (j.stats as any)[k];
              const n = typeof v === "number" ? v : Number(v);
              stats[k] = Number.isFinite(n) ? n : 0;
            }
          }
        }
      } catch {}
      return { summary: summary || (text || "").trim().slice(0, 500), stats };
    } catch {
      return { summary: null, stats: null };
    }
  };

  // Подготовим список меток месяцев для нужного периода (используется как подсказка ИИ)
  const from = new Date(job.periodFrom);
  const to = new Date(job.periodTo);
  const monthLabels: string[] = [];
  for (const dt of eachMonth(from, to)) monthLabels.push(labelFor(dt));

  let page: Page | null = null;
  try {
    // Try login with retries; fall back to plain page to avoid failing the whole job
    const maxLoginAttempts = 2;
    let attempt = 0;
    let lastErr: any = null;
    while (attempt < maxLoginAttempts && !page) {
      attempt++;
      try {
        page = await loginAndGetPage();
      } catch (e: any) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (!page) {
      appendJobLog(
        id,
        `login failed: ${String(
          lastErr?.message || lastErr || "unknown"
        )}; fallback to plain page`
      );
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: resolvePuppeteerExec(),
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const p = await browser.newPage();
      p.setDefaultNavigationTimeout(ZZAP_TIMEOUT_MS);
      p.setDefaultTimeout(ZZAP_TIMEOUT_MS);
      await p.setViewport({ width: 1440, height: 900 });
      await p.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
      );
      try {
        await p.setExtraHTTPHeaders({
          "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        });
      } catch {}
      try {
        await p
          .goto(ZZAP_BASE, {
            waitUntil: "domcontentloaded",
            timeout: ZZAP_TIMEOUT_MS,
          })
          .catch(() => {});
      } catch {}
      page = p;
    }
    appendJobLog(
      id,
      `Login OK. Start processing batch size=${toProcess.length}`
    );
    for (let idx = 0; idx < toProcess.length; idx++) {
      const realIndex = processed + idx;
      const { article, brand } = toProcess[idx];
      try {
        appendJobLog(id, `→ ${article} / ${brand}: open search`);
        // Стартуем ранний перехват DX до открытия страницы, чтобы не упустить первый POST
        const dxEarly = captureTop3PricesFromDX(page, article, brand)
        await openSearch(page, article, brand);
        await debugShot(page, id, `search-after-open-${encodeURIComponent(article)}`)
        // 0) Попробовать перехватить цены из DX-пейлоада POST /public/search.aspx
        let prices = await dxEarly
        if (!prices || prices.length === 0) {
          // Вторая попытка перехвата, если ранний POST не поймали
          prices = await captureTop3PricesFromDX(page, article, brand)
        }
        // Если DX-перехват дал цены — пропускаем DOM-метрики/ожидания и DOM-скрейпинг
        if (!prices || prices.length === 0) {
          // Debug: log basic DOM metrics for price scraping
          try {
            const dbg = await page.evaluate(() => {
              const rows = Array.from(document.querySelectorAll('tr[id*="SearchGridView_DXDataRow"], tr[id*="GridView_DXDataRow"]')).length
              const spans = Array.from(document.querySelectorAll('span[class*="dxeBase_ZZap" i].dx-nowrap')).length
              const priceCells = Array.from(document.querySelectorAll('td.pricewhitecell, td[class*="price" i]')).length
              const sampleNodes = Array.from(document.querySelectorAll('span[class*="dxeBase_ZZap" i].dx-nowrap')).slice(0, 6) as HTMLElement[]
              const sample = sampleNodes.map(n => (n.innerText||n.textContent||'').trim()).filter(Boolean)
              return { rows, spans, priceCells, sample }
            });
            appendJobLog(id, `dom: rows=${dbg.rows} spans=${dbg.spans} priceCells=${dbg.priceCells} sample=[${dbg.sample.join(' | ')}]`)
          } catch {}
          try {
            await page.waitForSelector(
              'tr[id*="SearchGridView_DXDataRow"], table[id*="SearchGridView_DXMainTable"], #ctl00_BodyPlace_SearchGridView',
              { timeout: 20000 }
            );
          } catch {}
          // Also wait for typical price elements that may render outside rows
          try {
            await page.waitForSelector(
              'span[class*="dxeBase_ZZap" i].dx-nowrap, td.pricewhitecell, [class*="price" i], span[id^="ctl00_BodyPlace_SearchGridView_"][class*="dx-nowrap" i]',
              { timeout: 12000 }
            );
          } catch {}
          // let client JS finalize rendering
          await sleep(1800);
          // Sanity check: ensure target article/brand is present, otherwise retry openSearch once
          let hasTarget = await pageContainsArticleBrand(page, article, brand)
          if (!hasTarget) {
            appendJobLog(id, `sanity: article/brand not found on page, retry openSearch`)
            await openSearch(page, article, brand)
            await sleep(1200)
            hasTarget = await pageContainsArticleBrand(page, article, brand)
          }
          await debugShot(page, id, `search-before-scrape-${encodeURIComponent(article)}`)
          prices = await scrapeTop3Prices(page, brand, article);
        }
        // Keep original behavior: не трогаем цены пост-фильтрами здесь
        appendJobLog(
          id,
          `prices: ${prices.map((p) => String(p)).join(", ") || "—"}`
        );
        // 1) Быстрый способ: в той же вкладке кликнуть "Статистика" и перехватить DX
        let monthly: { label: string; count: number }[] | null = await captureDxFromSearch(page, id, article)
        // 2) Если не получилось, fallback через screenshot URL и навигацию на страницу графика
        // Prefer to warm session + get exact stats URL via screenshot first
        let imageUrl: string | null = null;
        let statsUrlFromShot: string | null = null;
        if (!monthly || monthly.length === 0) {
          try {
            for (let a = 0; a < 2; a++) {
              const shot = await callScreenshot(article, brand);
              imageUrl = shot.imageUrl;
              statsUrlFromShot = shot.statsUrl;
              if (imageUrl || statsUrlFromShot) break;
              await sleep(400);
            }
          } catch {}
          if (imageUrl) appendJobLog(id, `screenshot: ${imageUrl}`);
        }
        await debugShot(page, id, `before-stats-${encodeURIComponent(article)}`)

        // Try apply saved cookies from screenshot session (shared cookie file)
        try {
          await restoreSession(page);
        } catch {}

        // Decide stats page
        // Use single tab to reduce anti-bot triggers
        let statsPage: Page = page;
        if (!statsUrlFromShot && (!monthly || monthly.length === 0)) {
          const sp = await openStats(page);
          statsPage = sp;
          try {
            appendJobLog(id, `stats: ${statsPage.url?.() || "unknown"}`);
          } catch {}
        }
        // Gentle settle before DX triggers
        await sleep(600);
        await debugShot(statsPage, id, `stats-entry-${encodeURIComponent(article)}`)

        // Captcha handling: pause and one retry
        const urlNow = statsPage.url?.() || "";
        if (/\/sys\/captcha\.aspx/i.test(urlNow)) {
          appendJobLog(id, "captcha detected, sleeping 90s then retry once");
          await sleep(90000);
          try {
            const retryUrl = statsUrlFromShot || urlNow;
            await statsPage
              .goto(retryUrl, { waitUntil: "domcontentloaded", timeout: 20000 })
              .catch(() => {});
          } catch {}
          const after = statsPage.url?.() || "";
          if (/\/sys\/captcha\.aspx/i.test(after)) {
            appendJobLog(id, "captcha persists, skipping item");
            // Save empty stats and move on
            const counts: Record<string, number> = {};
            for (const ml of monthLabels) counts[ml] = 0;
            results[realIndex] = {
              article,
              brand,
              prices,
              stats: counts,
              imageUrl,
            };
            continue;
          }
        }

        // Try DevExpress DX payload first (reliable)
        if ((!monthly || monthly.length === 0) && statsUrlFromShot) appendJobLog(id, `dx: use screenshot url ${statsUrlFromShot}`);
        if (!monthly || monthly.length === 0) monthly = await fetchDxMonthly(statsPage, id, statsUrlFromShot || null);
        if (!monthly || monthly.length === 0) {
          // fallback to DOM/highcharts
          const m2 = await scrapeMonthlyCounts(statsPage, monthLabels);
          if (m2 && m2.length) {
            appendJobLog(id, `dom: monthly points=${m2.length}`);
            monthly = m2;
          } else if (imageUrl) {
            // Vision fallback from screenshot
            try {
              const ai = await callVisionAI(imageUrl, monthLabels);
              if (ai.stats) {
                monthly = Object.entries(ai.stats).map(([label, count]) => ({ label, count: Number(count) || 0 }));
                appendJobLog(id, `vision: monthly from image`);
              }
            } catch {}
          }
        }
        if (statsPage !== page) await statsPage.close().catch(() => {});

        // project into map yyyy-mm -> count (try to parse label)
        const counts: Record<string, number> = {};
        for (const ml of monthLabels) counts[ml] = 0;
        for (const r of monthly || []) {
          const lbl = toLabelFromCompact(r.label) || r.label;
          if (lbl in counts) counts[lbl] = r.count;
        }
        const nonZero = Object.entries(counts).filter(
          ([, v]) => (v as number) > 0
        ).length;
        appendJobLog(id, `mapped months nonzero=${nonZero}`);
        // If the entire row suspiciously matches previous row (prices + months), do one hard retry using a fresh tab
        try {
          const prev = results[realIndex - 1] as any
          const priceSig = (arr?: number[]) => (arr || []).slice(0,3).join('|')
          const monthSig = (obj?: Record<string, number>) => monthLabels.map(k => String((obj || {})[k] ?? 0)).join(',')
          const samePrices = prev && Array.isArray(prev?.prices) && priceSig(prev.prices) === priceSig(prices)
          const sameMonths = prev && typeof prev?.stats === 'object' && monthSig(prev.stats) === monthSig(counts)
          const differentKey = prev && (String(prev.article||'').toUpperCase() + '|' + String(prev.brand||'').toUpperCase()) !== (String(article).toUpperCase() + '|' + String(brand||'').toUpperCase())
          if (differentKey && samePrices && sameMonths) {
            appendJobLog(id, 'suspicious duplicate with previous row: hard retry in new tab')
            try {
              const p2 = await page.browser().newPage()
              try {
                p2.setDefaultNavigationTimeout(ZZAP_TIMEOUT_MS)
                p2.setDefaultTimeout(ZZAP_TIMEOUT_MS)
                await p2.setViewport({ width: 1440, height: 900 })
                await p2.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36')
              } catch {}
              try { await restoreSession(p2) } catch {}
              try { await openSearch(p2, article, brand) } catch {}
              try { await p2.waitForSelector('tr[id*="SearchGridView_DXDataRow"], table[id*="SearchGridView_DXMainTable"], #ctl00_BodyPlace_SearchGridView', { timeout: 20000 }) } catch {}
              await sleep(1500)
              const prices2 = await scrapeTop3Prices(p2, brand, article)
              let monthly2: { label: string; count: number }[] | null = await captureDxFromSearch(p2 as any, id, article)
              if (!monthly2 || monthly2.length === 0) {
                const m2 = await scrapeMonthlyCounts(p2 as any, monthLabels)
                if (m2 && m2.length) monthly2 = m2
              }
              const counts2: Record<string, number> = {}
              for (const ml of monthLabels) counts2[ml] = 0
              for (const r of monthly2 || []) {
                const lbl = toLabelFromCompact(r.label) || r.label
                if (lbl in counts2) counts2[lbl] = r.count
              }
              const prevHasPrices = Array.isArray(prev?.prices) && prev.prices.some(n => Number.isFinite(n))
              const nonZero2 = Object.values(counts2).some(v => (v as number) > 0)
              const hasFreshPrices = Array.isArray(prices2) && prices2.some(n => Number.isFinite(n))
              // Replace only if:
              // - previous had prices: require fresh prices
              // - previous had no prices: allow months improvement or fresh prices
              const allowReplace = prevHasPrices ? hasFreshPrices : (hasFreshPrices || nonZero2)
              const better = allowReplace && (priceSig(prices2) !== priceSig(prev?.prices) || monthSig(counts2) !== monthSig(prev?.stats))
              if (better) {
                prices = prices2
                for (const k of monthLabels) counts[k] = counts2[k] ?? counts[k]
                appendJobLog(id, 'hard retry: replaced row with fresh-tab result')
              } else {
                appendJobLog(id, 'hard retry: result still matches previous, keep original')
              }
              try { await p2.close() } catch {}
            } catch {}
          }
        } catch {}
        // Log compact result preview: prices + first N month values
        try {
          const maxPreview = Math.min(12, monthLabels.length);
          const preview = monthLabels
            .slice(0, maxPreview)
            .map((ml) => `${ml}=${counts[ml] ?? 0}`)
            .join(", ");
          const pricesStr = (prices || [])
            .slice(0, 3)
            .map((x) => String(x))
            .join(", ");
          appendJobLog(
            id,
            `result: prices=[${pricesStr}] ; months[0..${
              maxPreview - 1
            }]: ${preview}`
          );
        } catch {}
        // Guard against index drift: ensure we write into correct slot
        results[realIndex] = {
          article,
          brand,
          prices,
          stats: counts,
          imageUrl,
        };
        if (results[realIndex] && (results[realIndex] as any).article !== article) {
          appendJobLog(id, `WARN: index drift at ${realIndex}: got ${(results[realIndex] as any).article} expected ${article}`)
        }
      } catch (e: any) {
        appendJobLog(id, `ERROR ${article}: ${String(e?.message || e)}`);
        results[realIndex] = {
          article,
          brand,
          error: String(e?.message || e),
          prices: [],
          stats: {},
          imageUrl: null,
        };
      }
      const safeResults = results.map((v: any) => (v === undefined ? null : v));
      await (prisma as any).zzapReportJob.update({
        where: { id },
        data: { processed: realIndex + 1, results: safeResults },
      });
      // Check cancel flag between items
      const j2 = await (prisma as any).zzapReportJob.findUnique({
        where: { id },
        select: { status: true, total: true },
      });
      const s = j2?.status;
      if (s === "canceled") {
        return new Response(
          JSON.stringify({
            ok: true,
            status: "canceled",
            processed: realIndex + 1,
            total: j2?.total || rows.length,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json; charset=utf-8" },
          }
        );
      }
      // Gentle mode: delay between items to avoid anti-bot (skip after last item)
      if (realIndex + 1 < rows.length) {
        await sleep(jitter(ZZAP_DELAY_MS, ZZAP_DELAY_JITTER_MS));
      }
    }

    // If finished, attempt quick post-pass fix for suspicious duplicates, then build XLSX and upload
    const done = processed + toProcess.length >= rows.length;
    if (done) {
      appendJobLog(id, "finalizing: building XLSX");
      // build headers
      const from = new Date(job.periodFrom);
      const to = new Date(job.periodTo);
      const monthLabels: string[] = [];
      for (const dt of eachMonth(from, to)) monthLabels.push(labelFor(dt));
      // Post-pass: detect suspicious duplicates (different key but same prices+months)
      // and obviously empty rows (no prices AND all months == 0), then re-scrape a limited set in fresh tabs
      try {
        const priceSig = (arr?: number[]) => (arr || []).slice(0, 3).join('|')
        const monthSig = (obj?: Record<string, number>) => monthLabels.map(k => String((obj || {})[k] ?? 0)).join(',')
        const dupIdxs: number[] = []
        const emptyIdxs: number[] = []
        for (let i = 1; i < results.length; i++) {
          const prev = results[i - 1] as any
          const cur = results[i] as any
          if (!prev || !cur) continue
          const keyPrev = `${String(prev.article||'').toUpperCase()}|${String(prev.brand||'').toUpperCase()}`
          const keyCur  = `${String(cur.article||'').toUpperCase()}|${String(cur.brand||'').toUpperCase()}`
          if (keyPrev === keyCur) continue
          const curAllZeroMonths = monthLabels.every(k => Number((cur?.stats||{})[k] ?? 0) === 0)
          const curNoPrices = !Array.isArray(cur?.prices) || cur.prices.length === 0
          if (curNoPrices && curAllZeroMonths) emptyIdxs.push(i)
          if (priceSig(prev.prices) === priceSig(cur.prices) && monthSig(prev.stats) === monthSig(cur.stats)) {
            dupIdxs.push(i)
          }
        }
        const toFix = Array.from(new Set([...dupIdxs, ...emptyIdxs]))
        if (toFix.length > 0) {
          appendJobLog(id, `post-pass: found ${dupIdxs.length} dup + ${emptyIdxs.length} empty; re-scrape limited set`)
          const limit = Math.min(toFix.length, 4)
          for (let k = 0; k < limit; k++) {
            const i = toFix[k]
            const item = rows[i]
            if (!item) continue
            try {
              const p2 = await page.browser().newPage()
              try {
                p2.setDefaultNavigationTimeout(ZZAP_TIMEOUT_MS)
                p2.setDefaultTimeout(ZZAP_TIMEOUT_MS)
                await p2.setViewport({ width: 1440, height: 900 })
                await p2.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36')
              } catch {}
              try { await restoreSession(p2) } catch {}
              try { await openSearch(p2, item.article, item.brand) } catch {}
              try { await p2.waitForSelector('tr[id*="SearchGridView_DXDataRow"], table[id*="SearchGridView_DXMainTable"], #ctl00_BodyPlace_SearchGridView', { timeout: 20000 }) } catch {}
              await sleep(1200)
              const prices2 = await scrapeTop3Prices(p2, item.brand, item.article)
              let monthly2: { label: string; count: number }[] | null = await captureDxFromSearch(p2 as any, id, item.article)
              if (!monthly2 || monthly2.length === 0) {
                const m2 = await scrapeMonthlyCounts(p2 as any, monthLabels)
                if (m2 && m2.length) monthly2 = m2
              }
              const counts2: Record<string, number> = {}
              for (const ml of monthLabels) counts2[ml] = 0
              for (const r of monthly2 || []) {
                const lbl = toLabelFromCompact(r.label) || r.label
                if (lbl in counts2) counts2[lbl] = r.count
              }
              const prev = results[i - 1] as any
              const hasPrices = Array.isArray(prices2) && prices2.some(n => Number.isFinite(n))
              const hasNonZeroMonths = Object.values(counts2).some(v => (v as number) > 0)
              const improved = (hasPrices || hasNonZeroMonths)
                && (priceSig(prices2) !== priceSig(prev?.prices) || monthSig(counts2) !== monthSig(prev?.stats))
              if (improved) {
                results[i] = { article: item.article, brand: item.brand, prices: prices2, stats: counts2, imageUrl: (results[i] as any)?.imageUrl ?? null }
                appendJobLog(id, `post-pass: row ${i} fixed`) 
              } else {
                appendJobLog(id, `post-pass: row ${i} still matches previous; keep`) 
              }
              try { await p2.close() } catch {}
              await sleep(1000 + Math.floor(Math.random()*500))
            } catch {}
          }
        }
      } catch {}
      const title = [
        `Отчёт ZZAP на ${new Date().toLocaleDateString('ru-RU')}`
      ];
      const header = [
        "Артикул",
        "Бренд",
        "Цена 1",
        "Цена 2",
        "Цена 3",
        ...monthLabels,
      ];
      // Build fast lookup map by article|brand to avoid index drift
      const norm = (s: string) => (s || '').toString().trim().toUpperCase().replace(/\s+/g, '');
      const keyOf = (a: string, b: string) => `${norm(a)}|${norm(b)}`;
      const byKey = new Map<string, any>();
      for (const r of results || []) {
        if (!r || typeof r !== 'object') continue;
        const k = keyOf((r as any).article || '', (r as any).brand || '');
        if (k !== '|') byKey.set(k, r);
      }
      const aoa: any[][] = [title, header];
      for (let i = 0; i < rows.length; i++) {
        const rowDef = rows[i];
        const k = keyOf(rowDef.article, rowDef.brand);
        let r = byKey.get(k) || results[i] || null;
        if (!r) r = { article: rowDef.article, brand: rowDef.brand, prices: [], stats: {} };
        const row: (string | number)[] = [rowDef.article, rowDef.brand];
        const pRaw = ((r as any).prices || []) as number[];
        // Deduplicate prices here to avoid duplicate values in the final XLSX without touching scraping
        const pUniq: number[] = []
        for (const n of pRaw) {
          if (Number.isFinite(n) && !pUniq.includes(n)) pUniq.push(n)
          if (pUniq.length >= 3) break
        }
        row.push(pUniq[0] ?? "", pUniq[1] ?? "", pUniq[2] ?? "");
        for (const ml of monthLabels) {
          const v = ((r as any).stats && (r as any).stats[ml]) ?? "";
          row.push(v);
        }
        aoa.push(row);
      }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      // Merge title across all columns
      try {
        (ws["!merges"] = ws["!merges"] || []).push({
          s: { r: 0, c: 0 },
          e: { r: 0, c: header.length - 1 },
        });
      } catch {}
      XLSX.utils.book_append_sheet(wb, ws, "Отчёт");
      const buf = XLSX.write(wb, {
        type: "buffer",
        bookType: "xlsx",
      }) as Buffer;
      const key = `reports/zzap/${id}.xlsx`;
      const uploaded = await uploadBuffer(
        buf,
        key,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ).catch(() => null as any);
      const url = typeof uploaded === 'string' ? uploaded : uploaded?.url || null
      const safeResults = results.map((v: any) => (v === undefined ? null : v));
      await (prisma as any).zzapReportJob.update({
        where: { id },
        data: { status: "done", resultFile: url || key, results: safeResults },
      });
      appendJobLog(id, `finalizing: done -> ${url || key}`);
      appendJobLog(id, `DONE. result: ${url || key}`);
      return new Response(
        JSON.stringify({
          ok: true,
          status: "done",
          processed: rows.length,
          total: rows.length,
          resultFile: url || key,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          ok: true,
          status: "running",
          processed: processed + toProcess.length,
          total: rows.length,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        }
      );
    }
  } catch (e: any) {
    await (prisma as any).zzapReportJob.update({
      where: { id },
      data: { status: "error", error: String(e?.message || e) },
    });
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      }
    );
  } finally {
    try {
      await page?.browser()?.close?.();
    } catch {}
  }
}
