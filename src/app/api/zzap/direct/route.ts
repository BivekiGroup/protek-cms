import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const article = searchParams.get('article')?.trim()
  const brand = searchParams.get('brand')?.trim()
  if (!article) return new Response('article required', { status: 400 })
  const base = process.env.ZZAP_BASE || 'https://www.zzap.ru'
  const url = brand
    ? `${base}/public/search.aspx#rawdata=${encodeURIComponent(article)}&class_man=${encodeURIComponent(brand)}&partnumber=${encodeURIComponent(article)}`
    : `${base}/public/search.aspx#rawdata=${encodeURIComponent(article)}`
  return new Response(null, { status: 302, headers: { Location: url } })
}

