import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const articles: string[] = Array.isArray(body?.articles) ? body.articles : []
    if (!articles.length) return NextResponse.json({ matches: {} })

    const products = await prisma.product.findMany({
      where: { article: { in: articles.filter(Boolean) } },
      select: { id: true, article: true, name: true },
    })
    const matches: Record<string, { id: string; name: string }> = {}
    for (const p of products) {
      if (p.article) matches[p.article] = { id: p.id, name: p.name }
    }
    return NextResponse.json({ matches })
  } catch (error) {
    console.error('Ozon match error', error)
    return NextResponse.json({ error: 'Match failed' }, { status: 500 })
  }
}

