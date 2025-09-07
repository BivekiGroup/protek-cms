import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const model = typeof body?.model === 'string' ? body.model : ''
    const prompt = typeof body?.prompt === 'string' ? body.prompt : ''
    const imageUrls = Array.isArray(body?.imageUrls) ? body.imageUrls.filter((u: any) => typeof u === 'string') : undefined
    if (!model) return new Response(JSON.stringify({ ok: false, error: 'model_required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
    if (!prompt) return new Response(JSON.stringify({ ok: false, error: 'prompt_required' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
    const base = (process.env.POLZA_AI_BASE_URL || 'https://api.polza.ai/api/v1').replace(/\/$/, '')
    const apiKey = process.env.POLZA_AI_API_KEY || ''
    if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'polza_api_key_required' }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
    const payload: any = { model, prompt }
    if (imageUrls?.length) payload.imageUrls = imageUrls
    const res = await fetch(`${base}/videos/generations`, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const j = await res.json().catch(() => null)
    if (!res.ok) return new Response(JSON.stringify({ ok: false, error: j?.error?.message || j?.message || `HTTP ${res.status}` }), { status: res.status, headers: { 'content-type': 'application/json; charset=utf-8' } })
    return new Response(JSON.stringify({ ok: true, requestId: j?.requestId }), { status: 201, headers: { 'content-type': 'application/json; charset=utf-8' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
}

