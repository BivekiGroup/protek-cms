import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const job = await prisma.ozonImportJob.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ job })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to get status' }, { status: 500 })
  }
}

