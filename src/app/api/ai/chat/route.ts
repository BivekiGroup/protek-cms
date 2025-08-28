export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    // Minimal validation: require an array of role/content pairs
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'messages must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = process.env.POLZA_AI_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'POLZA_AI_API_KEY is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const baseURL = process.env.POLZA_AI_BASE_URL || 'https://api.polza.ai/api/v1'
    const model = process.env.POLZA_AI_MODEL || 'openai/gpt-4o'

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`AI provider error ${response.status}: ${text || response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    // If provider streams SSE, parse incrementally; otherwise, read JSON once
    if (contentType.includes('text/event-stream')) {
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader()
          if (!reader) return

          try {
            let buffer = ''
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed.startsWith('data:')) continue
                const data = trimmed.slice(5).trim()
                if (!data || data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.choices?.[0]?.delta
                  const content = delta?.content
                  if (content) controller.enqueue(encoder.encode(content))
                } catch {
                  // ignore malformed line
                }
              }
            }
            if (buffer) {
              // attempt to parse any trailing data
              const line = buffer.trim()
              if (line.startsWith('data:')) {
                const data = line.slice(5).trim()
                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.choices?.[0]?.delta
                  const content = delta?.content
                  if (content) controller.enqueue(encoder.encode(content))
                } catch {}
              }
            }
          } finally {
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Fallback: non-streaming JSON response
    const json = await response.json().catch(() => null as any)
    const text =
      json?.choices?.[0]?.message?.content ??
      json?.choices?.[0]?.delta?.content ??
      ''

    return new Response(text || '', {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('AI Chat Error:', error)
    return new Response(
      JSON.stringify({ error: 'Ошибка при обращении к AI провайдеру' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
