import type { SentMessageInfo } from 'nodemailer'

type NodemailerModule = typeof import('nodemailer')
type SmtpGlobal = typeof globalThis & { __smtp_verified?: boolean }

const getErrorDetails = (error: unknown): { code: string; message: string } => {
  if (typeof error !== 'object' || error === null) {
    return { code: '', message: typeof error === 'string' ? error : '' }
  }
  const withProps = error as { code?: unknown; errno?: unknown; message?: unknown }
  const codeValue = withProps.code ?? withProps.errno
  const code = typeof codeValue === 'string' || typeof codeValue === 'number' ? String(codeValue).toUpperCase() : ''
  const message = typeof withProps.message === 'string' ? withProps.message : ''
  return { code, message }
}

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
  let nodemailer: NodemailerModule | null = null
  try {
    nodemailer = await import('nodemailer')
  } catch (error) {
    throw new Error('nodemailer is not installed. Run: npm i nodemailer')
  }
  if (!nodemailer) {
    throw new Error('nodemailer module did not load')
  }

  // Try the configured port first, then smart fallbacks (465 SSL, 2525, 25 STARTTLS)
  const tried: string[] = []
  const seen = new Set<number>()
  const candidates: { port: number; secure: boolean }[] = []
  candidates.push({ port, secure: port === 465 })
  ;[465, 2525, 25].forEach((p) => { if (!seen.has(p) && p !== port) { candidates.push({ port: p, secure: p === 465 }); seen.add(p) } })

  let lastErr: unknown = null
  const globalState = globalThis as SmtpGlobal
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
      if (!globalState.__smtp_verified) {
        await transporter.verify()
        globalState.__smtp_verified = true
        console.log('[smtp] verified', { host, port: c.port, secure: c.secure })
      }
      const info: SentMessageInfo = await transporter.sendMail({ from, to, subject, html, text })
      return info
    } catch (error) {
      lastErr = error
      const { code, message } = getErrorDetails(error)
      const canRetry = ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ESOCKET'].includes(code) || /timed out|getaddrinfo|socket/i.test(message)
      console.warn('[smtp] attempt failed', { host, port: c.port, secure: c.secure, code, message })
      if (!canRetry) break
      // else try next candidate
    }
  }
  const { message: lastMessage } = getErrorDetails(lastErr)
  const finalMessage = lastMessage || String(lastErr ?? '') || 'Unknown error'
  throw new Error(`SMTP send failed via ports [${tried.join(', ')}]: ${finalMessage}`)
}
