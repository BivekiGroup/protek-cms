import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getCorsHeaders() {
  const isDev = process.env.NODE_ENV !== 'production'
  const allowedOrigin = process.env.FRONTEND_ORIGIN || (isDev ? 'http://localhost:3001' : 'https://protekauto.ru')
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Forwarded-For',
    'Cache-Control': 'no-store',
  }
}

function getClientIp(req: NextRequest): string | null {
  const xf = req.headers.get('x-forwarded-for') || ''
  if (xf) return xf.split(',')[0].trim()
  return null
}

function checkAuth(req: NextRequest): { ok: true } | { ok: false; status: number; body: any } {
  const apiKey = req.headers.get('x-api-key') || ''
  const expected = process.env.ONEC_API_TOKEN || ''
  if (!expected || apiKey !== expected) {
    return { ok: false, status: 401, body: { ok: false, error: 'Unauthorized' } }
  }
  // optional IP allow list
  const allowList = (process.env.ONEC_IP_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean)
  if (allowList.length) {
    const ip = getClientIp(req)
    if (!ip || !allowList.includes(ip)) {
      return { ok: false, status: 401, body: { ok: false, error: 'IP not allowed' } }
    }
  }
  return { ok: true }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: getCorsHeaders() })
}

export async function GET(req: NextRequest) {
  const headers = new Headers(getCorsHeaders())
  headers.set('content-type', 'application/json; charset=utf-8')

  const auth = checkAuth(req)
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers })
  }

  const reqId = randomUUID()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') || 50) || 50, 500)
  const offset = Number(searchParams.get('offset') || 0) || 0
  const statusFilter = (searchParams.get('status') || '').trim().toUpperCase()
  const from = searchParams.get('from') // ISO date
  const to = searchParams.get('to') // ISO date
  const searchOrderNumber = searchParams.get('orderNumber') || undefined

  const where: any = {}
  if (statusFilter) where.status = statusFilter
  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as any).gte = new Date(from)
    if (to) (where.createdAt as any).lte = new Date(to)
  }
  if (searchOrderNumber) where.orderNumber = searchOrderNumber

  try {
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: { items: true, payments: true },
      }),
    ])

    const results = orders.map((o) => mapOrderToOneCSchema(o))

    const body = {
      ok: true,
      result: results,
      count: total,
      limit,
      offset,
      requestId: reqId,
    }
    return new Response(JSON.stringify(body), { status: 200, headers })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e), requestId: reqId }), { status: 500, headers })
  }
}

function mapOrderToOneCSchema(order: any) {
  const paid = Array.isArray(order.payments) && order.payments.some((p: any) => p.status === 'SUCCEEDED')
  const cancelled = order.status === 'CANCELED'

  // Best-effort status mapping to expected consumer strings
  const statusMap: Record<string, string> = {
    PENDING: 'awaiting_packaging',
    PAID: 'awaiting_packaging',
    PROCESSING: 'awaiting_packaging',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELED: 'cancelled',
    REFUNDED: 'cancelled',
  }
  const status = statusMap[order.status] || 'awaiting_packaging'

  const shipmentDate = new Date(order.createdAt)
  shipmentDate.setDate(shipmentDate.getDate() + 1)

  return {
    posting_number: order.orderNumber, // no shipments – reuse order number
    order_number: order.orderNumber,
    status,

    delivery_method: {
      id: 0,
      name: '',
      warehouse_id: 0,
      warehouse: '',
      tpl_provider_id: 0,
      tpl_provider: '',
    },

    tracking_number: '',
    in_process_at: order.createdAt?.toISOString() || null,
    shipment_date: shipmentDate.toISOString(),
    the_amount_includes_VAT: true,
    cancelled,
    paid,
    comment: order.comment || '',

    products: (order.items || []).map((it: any) => {
      const price = Number(it.price || 0)
      const qty = Number(it.quantity || 0)
      const amount = Number(it.totalPrice ?? price * qty)
      const amountDiscount = 0
      const amountTotal = amount - amountDiscount
      return {
        price: String(price),
        currency_code: order.currency || 'RUB',
        offer_id: it.article || it.externalId || it.name,
        name: it.name,
        sku: 0,
        quantity: qty,
        amount: String(amount),
        amount_VAT: '0',
        amount_discount: String(amountDiscount),
        amount_total: String(amountTotal),
        mandatory_mark: [],
      }
    }),

    addressee: {
      name: order.clientName || '',
      phone: order.clientPhone || '',
    },

    barcodes: {
      upper_barcode: '',
      lower_barcode: '',
    },

    analytics_data: {
      region: '',
      city: '',
      delivery_type: '',
      warehouse: '',
      tpl_provider_id: 0,
      tpl_provider: '',
      delivery_date_begin: null,
      delivery_date_end: null,
    },
  }
}

