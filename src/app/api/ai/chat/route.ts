export async function POST(req: Request) {
  // Helpers
  const safeJson = async () => { try { return await req.json() } catch { return null as any } }
  const mapModel = (provider: string, m?: string | null) => {
    const raw = (m || '').trim(); if (!raw) return null
    return provider === 'openai' && raw.includes('/') ? raw.split('/').slice(1).join('/') : raw
  }
  const withTimeout = (ms: number) => { const c = new AbortController(); const id = setTimeout(() => c.abort(), ms); return { signal: c.signal, clear: () => clearTimeout(id) } }

  const body = await safeJson()
  const messages = Array.isArray(body?.messages) ? body.messages : null
  const modelOverride = typeof body?.model === 'string' ? body.model : null
  const streamOverride = body?.stream
  const temperature = typeof body?.temperature === 'number' ? Math.max(0, Math.min(1, body.temperature)) : undefined
  if (!messages) return new Response(JSON.stringify({ error: 'messages must be an array' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const providers: { name: 'polza' | 'openai'; base: string; key?: string; defaultModel?: string }[] = []
  if (process.env.POLZA_AI_API_KEY) providers.push({ name: 'polza', base: (process.env.POLZA_AI_BASE_URL || 'https://api.polza.ai/api/v1').replace(/\/$/, ''), key: process.env.POLZA_AI_API_KEY, defaultModel: process.env.POLZA_AI_MODEL || 'openai/gpt-4o' })
  if (process.env.OPENAI_API_KEY) providers.push({ name: 'openai', base: 'https://api.openai.com/v1', key: process.env.OPENAI_API_KEY, defaultModel: process.env.OPENAI_MODEL || 'gpt-4o' })
  if (providers.length === 0) return new Response(JSON.stringify({ error: 'No AI providers configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })

  const wantStream = streamOverride === false ? false : true
  const encoder = new TextEncoder(); const decoder = new TextDecoder()

  for (const p of providers) {
    const url = `${p.base}/chat/completions`
    const model = mapModel(p.name, modelOverride) || mapModel(p.name, p.defaultModel) || undefined
    // Streaming usually starts quickly; non-streaming may take longer to finish.
    const timeoutMs = wantStream ? 20000 : 60000
    const { signal, clear } = withTimeout(timeoutMs)
    try {
      const payload: any = { model, messages, stream: wantStream }
      if (typeof temperature === 'number') payload.temperature = temperature
      const response = await fetch(url, { method: 'POST', signal, headers: { 'Authorization': `Bearer ${p.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      clear()
      if (!response.ok) continue
      const contentType = response.headers.get('content-type') || ''
      if (wantStream && contentType.includes('text/event-stream')) {
        const stream = new ReadableStream({
          async start(controller) {
            const reader = response.body?.getReader(); if (!reader) { controller.close(); return }
            let buffer = ''
            try {
              while (true) {
                const { done, value } = await reader.read(); if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n'); buffer = lines.pop() || ''
                for (const line of lines) {
                  const trimmed = line.trim(); if (!trimmed.startsWith('data:')) continue
                  const data = trimmed.slice(5).trim(); if (!data || data === '[DONE]') continue
                  try { const parsed = JSON.parse(data); const content = parsed.choices?.[0]?.delta?.content; if (content) controller.enqueue(encoder.encode(content)) } catch {}
                }
              }
              if (buffer) {
                const line = buffer.trim(); if (line.startsWith('data:')) { const data = line.slice(5).trim(); try { const parsed = JSON.parse(data); const content = parsed.choices?.[0]?.delta?.content; if (content) controller.enqueue(encoder.encode(content)) } catch {} }
              }
            } catch (e: any) { if (e?.name !== 'AbortError') console.error('AI stream error:', e) } finally { controller.close() }
          }
        })
        return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } })
      }
      const json = await response.json().catch(() => null as any)
      const text = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.delta?.content ?? ''
      return new Response(text || '', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } })
    } catch (e: any) {
      clear(); if (e?.name !== 'AbortError') console.warn(`AI provider ${p.name} failed:`, e?.message || e); continue
    }
  }
  return new Response(JSON.stringify({ error: 'Все AI провайдеры недоступны. Повторите позже.' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
}
