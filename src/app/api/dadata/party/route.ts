import { NextRequest } from 'next/server'

function getCorsHeaders() {
  const isDev = process.env.NODE_ENV === 'development'
  const allowedOrigin = isDev
    ? (process.env.FRONTEND_ORIGIN || 'http://localhost:3001')
    : (process.env.FRONTEND_ORIGIN || 'https://protekauto.ru')
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: getCorsHeaders() })
}

export async function POST(req: NextRequest) {
  const headers = new Headers(getCorsHeaders())
  const apiKey = process.env.DADATA_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DADATA_API_KEY is not configured on CMS' }), { status: 500, headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' } })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const payload = {
      query: body?.query || '',
      branch_type: body?.branch_type || 'MAIN',
      type: body?.type,
      count: body?.count || 5,
      kpp: body?.kpp,
      status: body?.status,
    }

    const resp = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await resp.json().catch(() => null)
    const resHeaders = { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data?.message || 'DaData error' }), { status: resp.status, headers: resHeaders })
    }
    return new Response(JSON.stringify(data), { status: 200, headers: resHeaders })
  } catch (e: any) {
    const resHeaders = { ...Object.fromEntries(getCorsHeaders()), 'Content-Type': 'application/json' }
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), { status: 500, headers: resHeaders })
  }
}

