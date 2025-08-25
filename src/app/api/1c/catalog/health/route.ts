import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function getCorsHeaders() {
  const isDev = process.env.NODE_ENV !== 'production'
  const allowedOrigin = process.env.FRONTEND_ORIGIN || (isDev ? 'http://localhost:3001' : 'https://protekauto.ru')
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Idempotency-Key, X-Forwarded-For',
    'Cache-Control': 'no-store'
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: getCorsHeaders() })
}

export async function GET(req: NextRequest) {
  const headers = new Headers(getCorsHeaders())
  const schemaVersion = '1c-catalog-v1'
  const maxBatch = Number(process.env.ONEC_MAX_BATCH_SIZE || 1000)
  const strict = (process.env.ONEC_STRICT_VALIDATION || 'false') === 'true'
  const debug = new URL(req.url).searchParams.get('debug') === '1'

  const providedKey = req.headers.get('x-api-key') || undefined
  const expected = process.env.ONEC_API_TOKEN || ''
  const allowList = (process.env.ONEC_IP_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()

  const payload: any = {
    ok: true,
    version: schemaVersion,
    limits: { maxBatch },
    strictValidation: strict,
    time: new Date().toISOString(),
  }

  if (debug) {
    payload.authDebug = {
      tokenConfigured: Boolean(expected),
      headerPresent: Boolean(providedKey),
      authOk: Boolean(expected && providedKey && providedKey === expected),
      ipAllowListEnabled: allowList.length > 0,
      clientIp: ip || null
    }
  }

  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(payload), { status: 200, headers })
}
