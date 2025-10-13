import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function getCorsHeaders() {
  const isDev = process.env.NODE_ENV !== 'production'
  const allowedOrigin = process.env.FRONTEND_ORIGIN || (isDev ? 'http://localhost:3001' : 'https://protekauto.ru')
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Forwarded-For',
    'Cache-Control': 'no-store'
  }
}

function checkAuth(req: NextRequest): { ok: true } | { ok: false; status: number; body: any } {
  const apiKey = req.headers.get('x-api-key') || ''
  const expected = process.env.ONEC_API_TOKEN || ''
  if (!expected || apiKey !== expected) {
    return { ok: false, status: 401, body: { ok: false, error: 'Unauthorized' } }
  }
  return { ok: true }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: getCorsHeaders() })
}

function mapClientView(type: string | null | undefined) {
  if (type === 'LEGAL_ENTITY') return 'legal entity'
  if (type === 'INDIVIDUAL') return 'physical entity'
  return ''
}

function extractMailingAddress(comment?: string | null) {
  if (!comment) return ''
  const lines = comment.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^Почтовый адрес:\s*(.+)$/i)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  return ''
}

export async function GET(req: NextRequest) {
  const headers = new Headers(getCorsHeaders())
  headers.set('content-type', 'application/json; charset=utf-8')

  const auth = checkAuth(req)
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers })
  }

  const clients = await prisma.client.findMany({
    where: {
      legalEntities: {
        some: {},
      },
    },
    select: {
      clientNumber: true,
      name: true,
      inn: true,
      kpp: true,
      ogrn: true,
      type: true,
      actualAddress: true,
      legalAddress: true,
      comment: true,
      email: true,
      phone: true,
      bankBik: true,
      bankAccount: true,
      legalEntities: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          fullName: true,
          shortName: true,
          inn: true,
          ogrn: true,
          registrationReasonCode: true,
          legalAddress: true,
          actualAddress: true,
          bankDetails: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              bik: true,
              accountNumber: true,
              bankName: true,
              correspondentAccount: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })

  const users = clients.map((c) => ({
    code: c.clientNumber,
    name: c.legalEntities[0]?.fullName ?? c.legalEntities[0]?.shortName ?? c.name,
    inn: c.legalEntities[0]?.inn ?? c.inn ?? '',
    kpp: c.legalEntities[0]?.registrationReasonCode ?? c.kpp ?? '',
    ogrn: c.legalEntities[0]?.ogrn ?? c.ogrn ?? '',
    view: c.legalEntities.length > 0 ? 'legal entity' : mapClientView(c.type),
    address: {
      actual: c.legalEntities[0]?.actualAddress ?? c.actualAddress ?? '',
      legal: c.legalEntities[0]?.legalAddress ?? c.legalAddress ?? '',
      mailing: extractMailingAddress(c.comment),
    },
    contact_information: {
      telephone: c.phone ?? '',
      email: c.email ?? '',
    },
    bank_requisites: {
      bik: c.legalEntities[0]?.bankDetails[0]?.bik ?? c.bankBik ?? '',
      account_number: c.legalEntities[0]?.bankDetails[0]?.accountNumber ?? c.bankAccount ?? '',
    },
  }))

  return new Response(JSON.stringify({ users }), { status: 200, headers })
}
