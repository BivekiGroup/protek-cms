export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user || 'no-reply@example.com'

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM')
  }

  // Dynamic import to avoid hard dependency if not installed locally
  let nodemailer: any
  try {
    nodemailer = await import('nodemailer')
  } catch (e) {
    throw new Error('nodemailer is not installed. Run: npm i nodemailer')
  }

  // Try the configured port first, then smart fallbacks (465 SSL, 2525, 25 STARTTLS)
  const tried: string[] = []
  const seen = new Set<number>()
  const candidates: { port: number; secure: boolean }[] = []
  candidates.push({ port, secure: port === 465 })
  ;[465, 2525, 25].forEach((p) => { if (!seen.has(p) && p !== port) { candidates.push({ port: p, secure: p === 465 }); seen.add(p) } })

  let lastErr: any = null
  for (const c of candidates) {
    tried.push(`${c.port}${c.secure ? ':ssl' : ''}`)
    const transporter = nodemailer.createTransport({
      host,
      port: c.port,
      secure: c.secure,
      auth: { user, pass },
      connectionTimeout: 20_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    })
    try {
      if (!(global as any).__smtp_verified) {
        await transporter.verify()
        ;(global as any).__smtp_verified = true
        console.log('[smtp] verified', { host, port: c.port, secure: c.secure })
      }
      const info = await transporter.sendMail({ from, to, subject, html, text })
      return info
    } catch (e: any) {
      lastErr = e
      const code = String((e && (e.code || e.errno)) || '').toUpperCase()
      const msg = String(e?.message || e)
      const canRetry = ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ESOCKET'].includes(code) || /timed out|getaddrinfo|socket/i.test(msg)
      console.warn('[smtp] attempt failed', { host, port: c.port, secure: c.secure, code, msg })
      if (!canRetry) break
      // else try next candidate
    }
  }
  throw new Error(`SMTP send failed via ports [${tried.join(', ')}]: ${String(lastErr?.message || lastErr)}`)
}
