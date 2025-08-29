export async function GET() {
  const model = process.env.POLZA_AI_MODEL || 'openai/gpt-4o'
  const baseURL = process.env.POLZA_AI_BASE_URL || 'https://api.polza.ai/api/v1'
  const hasKey = Boolean(process.env.POLZA_AI_API_KEY)
  return new Response(
    JSON.stringify({ ok: true, model, baseURL, hasApiKey: hasKey }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  )
}

