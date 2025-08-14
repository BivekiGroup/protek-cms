import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Meta = {
  title?: string | null
  description?: string | null
  keywords?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: string | null
  canonicalUrl?: string | null
  noIndex?: boolean | null
  noFollow?: boolean | null
  structuredData?: any | null
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const path = (url.searchParams.get('path') || '').trim()
    if (!path || !path.startsWith('/')) {
      return NextResponse.json({ error: 'Query param "path" is required' }, { status: 400 })
    }

    const anyPrisma: any = prisma as any

    // 1) EXACT match
    const exact = await anyPrisma.seoPageConfig?.findFirst?.({
      where: { matchType: 'EXACT', pattern: path },
    })
    if (exact) return ok(mapMeta(exact))

    // 2) PREFIX (choose the longest matching pattern)
    const prefixes = await anyPrisma.seoPageConfig?.findMany?.({
      where: { matchType: 'PREFIX' },
    })
    if (Array.isArray(prefixes) && prefixes.length) {
      const best = prefixes
        .filter((p: any) => typeof p.pattern === 'string' && path.startsWith(p.pattern))
        .sort((a: any, b: any) => (b.pattern?.length || 0) - (a.pattern?.length || 0))[0]
      if (best) return ok(mapMeta(best))
    }

    // 3) REGEX (first match by updatedAt desc)
    const regexes = await anyPrisma.seoPageConfig?.findMany?.({
      where: { matchType: 'REGEX' },
      orderBy: { updatedAt: 'desc' },
    })
    if (Array.isArray(regexes) && regexes.length) {
      for (const r of regexes) {
        try {
          if (r?.pattern && new RegExp(r.pattern).test(path)) {
            return ok(mapMeta(r))
          }
        } catch {}
      }
    }

    return NextResponse.json({ meta: null }, { status: 200, headers: corsHeaders() })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders() })
  }
}

function mapMeta(row: any): Meta {
  return {
    title: row?.title ?? null,
    description: row?.description ?? null,
    keywords: row?.keywords ?? null,
    ogTitle: row?.ogTitle ?? null,
    ogDescription: row?.ogDescription ?? null,
    ogImage: row?.ogImage ?? null,
    canonicalUrl: row?.canonicalUrl ?? null,
    noIndex: !!row?.noIndex,
    noFollow: !!row?.noFollow,
    structuredData: row?.structuredData ?? null,
  }
}

function ok(meta: Meta) {
  return NextResponse.json({ meta }, { status: 200, headers: corsHeaders() })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

