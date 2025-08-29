export async function GET() {
  try {
    const apiKey = process.env.POLZA_AI_API_KEY
    const baseURL = process.env.POLZA_AI_BASE_URL || 'https://api.polza.ai/api/v1'
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'POLZA_AI_API_KEY is not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    const res = await fetch(`${baseURL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })
    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = text }
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, status: res.status, error: data }), { status: res.status, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

