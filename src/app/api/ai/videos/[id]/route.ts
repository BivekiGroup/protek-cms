import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const base = (process.env.POLZA_AI_BASE_URL || 'https://api.polza.ai/api/v1').replace(/\/$/, '')
    const apiKey = process.env.POLZA_AI_API_KEY || ''
    if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'polza_api_key_required' }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
    const res = await fetch(`${base}/videos/${encodeURIComponent(id)}`, { headers: { 'Authorization': `Bearer ${apiKey}` } })
    const j = await res.json().catch(() => null)
    if (!res.ok) return new Response(JSON.stringify({ ok: false, error: j?.error?.message || j?.message || `HTTP ${res.status}` }), { status: res.status, headers: { 'content-type': 'application/json; charset=utf-8' } })
    return new Response(JSON.stringify(j), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
}

