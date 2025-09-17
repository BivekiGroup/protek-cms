"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DayPoint = { d: string; c: number }
type TopItem = { q?: string; b?: string; a?: string; c: number }
type SummaryData = {
  searchByDay: DayPoint[]
  viewsByDay: DayPoint[]
  topQueries: TopItem[]
  topBrands: TopItem[]
  topArticles: TopItem[]
}

type KpiGroup = { d1?: number; d7?: number; d30?: number }
type AnalyticsKpi = { search?: KpiGroup; views?: KpiGroup }

type RecentSearch = { createdAt: string; query?: string; resultsCount?: number }
type RecentView = { createdAt: string; brand?: string; article?: string }
type RecentData = { searches: RecentSearch[]; views: RecentView[] }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const normalizeDayPoints = (value: unknown): DayPoint[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!isRecord(item)) return null
      const d = typeof item.d === 'string' ? item.d : typeof item.date === 'string' ? item.date : null
      const cRaw = 'c' in item ? item.c : 'count' in item ? item.count : undefined
      const c = typeof cRaw === 'number' ? cRaw : Number(cRaw)
      if (!d || Number.isNaN(c)) return null
      return { d, c }
    })
    .filter((point): point is DayPoint => Boolean(point))
}

const normalizeTopItems = (value: unknown): TopItem[] => {
  if (!Array.isArray(value)) return []
  const result: TopItem[] = []
  for (const raw of value) {
    if (!isRecord(raw)) continue
    const q = typeof raw.q === 'string' ? raw.q : undefined
    const b = typeof raw.b === 'string' ? raw.b : undefined
    const a = typeof raw.a === 'string' ? raw.a : undefined
    const countCandidate = 'c' in raw ? raw.c : 'count' in raw ? raw.count : undefined
    const c = typeof countCandidate === 'number' ? countCandidate : Number(countCandidate)
    if (Number.isNaN(c)) continue
    result.push({ q, b, a, c })
  }
  return result
}

const normalizeSummary = (value: unknown): SummaryData => {
  if (!isRecord(value)) {
    return { searchByDay: [], viewsByDay: [], topQueries: [], topBrands: [], topArticles: [] }
  }
  return {
    searchByDay: normalizeDayPoints(value.searchByDay),
    viewsByDay: normalizeDayPoints(value.viewsByDay),
    topQueries: normalizeTopItems(value.topQueries),
    topBrands: normalizeTopItems(value.topBrands),
    topArticles: normalizeTopItems(value.topArticles),
  }
}

const normalizeKpi = (value: unknown): AnalyticsKpi | null => {
  if (!isRecord(value)) return null
  const toGroup = (raw: unknown): KpiGroup | undefined => {
    if (!isRecord(raw)) return undefined
    const read = (key: string) => (typeof raw[key] === 'number' ? raw[key] as number : Number(raw[key]))
    const d1 = read('d1')
    const d7 = read('d7')
    const d30 = read('d30')
    return {
      d1: Number.isFinite(d1) ? d1 : undefined,
      d7: Number.isFinite(d7) ? d7 : undefined,
      d30: Number.isFinite(d30) ? d30 : undefined,
    }
  }
  return {
    search: toGroup(value.search),
    views: toGroup(value.views),
  }
}

const normalizeRecent = (value: unknown): RecentData | null => {
  if (!isRecord(value)) return null
  if (!value.ok) return null
  const normalizeSearches = normalizeRecentArray<RecentSearch>(value.searches, (item) => {
    if (!isRecord(item) || typeof item.createdAt !== 'string') return null
    return {
      createdAt: item.createdAt,
      query: typeof item.query === 'string' ? item.query : undefined,
      resultsCount: typeof item.resultsCount === 'number' ? item.resultsCount : Number(item.resultsCount) || 0,
    }
  })
  const normalizeViews = normalizeRecentArray<RecentView>(value.views, (item) => {
    if (!isRecord(item) || typeof item.createdAt !== 'string') return null
    return {
      createdAt: item.createdAt,
      brand: typeof item.brand === 'string' ? item.brand : undefined,
      article: typeof item.article === 'string' ? item.article : undefined,
    }
  })
  return { searches: normalizeSearches, views: normalizeViews }
}

function normalizeRecentArray<T>(value: unknown, mapper: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return []
  return value.map(mapper).filter((item): item is T => Boolean(item))
}

const getErrorMessage = (error: unknown, fallback = 'Не удалось загрузить данные'): string => {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return fallback
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<SummaryData | null>(null)
  const [kpi, setKpi] = useState<AnalyticsKpi | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<RecentData | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch(`/api/analytics/summary?days=${days}`)
        if (!res.ok) throw new Error(`summary ${res.status}`)
        const json = (await res.json().catch(() => null)) as unknown
        setData(normalizeSummary(json))
        try {
          const kRes = await fetch('/api/analytics/kpi', { cache: 'no-store' })
          const kJson = (await kRes.json().catch(() => null)) as unknown
          setKpi(normalizeKpi(kJson))
        } catch {}
        try {
          const rRes = await fetch('/api/analytics/recent?limit=20', { cache: 'no-store' })
          const rJson = (await rRes.json().catch(() => null)) as unknown
          const recentData = normalizeRecent(rJson)
          if (recentData) setRecent(recentData)
        } catch {}
      } catch (error) {
        setError(getErrorMessage(error, 'Не удалось загрузить аналитику'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [days])

  const AreaChart = ({ points, color }: { points: DayPoint[]; color: string }) => {
    const width = 640
    const height = 160
    const pad = 16
    const values = points.map(p => Number(p.c)||0)
    const max = Math.max(1, ...values)
    const stepX = points.length > 1 ? (width - pad*2) / (points.length - 1) : 0
    const toY = (v: number) => height - pad - (v / max) * (height - pad*2)
    const path = points.map((p, i) => `${i===0 ? 'M' : 'L'} ${pad + i*stepX},${toY(Number(p.c)||0)}`).join(' ')
    const area = `${path} L ${pad + (points.length-1)*stepX},${height - pad} L ${pad},${height - pad} Z`
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect x={pad} y={pad} width={width - pad*2} height={height - pad*2} fill="#fafafa" rx={8} />
        <path d={area} fill="url(#grad)" />
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
      </svg>
    )
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Аналитика</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Период (дней):</label>
          <select className="border rounded px-2 py-1" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>1</option>
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
            <option value={90}>90</option>
          </select>
          <button
            className="ml-2 inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            onClick={async () => {
              try {
                const res = await fetch(`/api/analytics/export/xlsx?days=${days}`, { cache: 'no-store' })
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `analytics-${new Date().toISOString().slice(0,10)}.xlsx`
                document.body.appendChild(a)
                a.click()
                a.remove()
                URL.revokeObjectURL(url)
              } catch {}
            }}
          >Экспорт XLSX</button>
        </div>
      </div>

      {loading && <div>Загрузка…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KPI */}
          {kpi && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Ключевые показатели</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded p-4 bg-white">
                    <div className="text-xs text-gray-500">Поиски</div>
                    <div className="text-3xl font-semibold">{kpi.search?.d1}</div>
                    <div className="text-xs text-gray-500">за 1 день</div>
                  </div>
                  <div className="border rounded p-4 bg-white">
                    <div className="text-xs text-gray-500">Поиски</div>
                    <div className="text-3xl font-semibold">{kpi.search?.d7}</div>
                    <div className="text-xs text-gray-500">за 7 дней</div>
                  </div>
                  <div className="border rounded p-4 bg-white">
                    <div className="text-xs text-gray-500">Поиски</div>
                    <div className="text-3xl font-semibold">{kpi.search?.d30}</div>
                    <div className="text-xs text-gray-500">за 30 дней</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="border rounded p-4 bg-white">
                    <div className="text-xs text-gray-500">Просмотры карточек</div>
                    <div className="text-3xl font-semibold">{kpi.views?.d1}</div>
                    <div className="text-xs text-gray-500">за 1 день</div>
                  </div>
                  <div className="border rounded p-4 bg-white">
                    <div className="text-xs text-gray-500">Просмотры карточек</div>
                    <div className="text-3xl font-semibold">{kpi.views?.d7}</div>
                    <div className="text-xs text-gray-500">за 7 дней</div>
                  </div>
                  <div className="border rounded p-4 bg-white">
                    <div className="text-xs text-gray-500">Просмотры карточек</div>
                    <div className="text-3xl font-semibold">{kpi.views?.d30}</div>
                    <div className="text-xs text-gray-500">за 30 дней</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Поиск по дням</CardTitle></CardHeader>
            <CardContent>
              <AreaChart points={data.searchByDay} color="#2563eb" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Просмотры карточек по дням</CardTitle></CardHeader>
            <CardContent>
              <AreaChart points={data.viewsByDay} color="#059669" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Топ запросов</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                {data.topQueries.slice(0, 20).map((item, index) => {
                  const baseline = Math.max(1, Number(data.topQueries[0]?.c || 1))
                  const ratio = Math.min(100, Math.round((Number(item.c) || 0) / baseline * 100))
                  return (
                    <li key={index} className="flex items-center gap-3">
                      <span className="w-8 text-xs text-gray-500">{index + 1}</span>
                      <div className="flex-1">
                        <div className="truncate">{item.q}</div>
                        <div className="h-2 bg-gray-100 rounded">
                          <div className="h-2 rounded bg-gradient-to-r from-blue-500 to-sky-400" style={{ width: `${ratio}%` }} />
                        </div>
                      </div>
                      <span className="w-12 text-right font-medium">{item.c}</span>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Топ брендов (поиск)</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                {data.topBrands.slice(0, 20).map((item, index) => {
                  const baseline = Math.max(1, Number(data.topBrands[0]?.c || 1))
                  const ratio = Math.min(100, Math.round((Number(item.c) || 0) / baseline * 100))
                  return (
                    <li key={index} className="flex items-center gap-3">
                      <span className="w-8 text-xs text-gray-500">{index + 1}</span>
                      <div className="flex-1">
                        <div className="truncate">{item.b}</div>
                        <div className="h-2 bg-gray-100 rounded">
                          <div className="h-2 rounded bg-gradient-to-r from-emerald-500 to-lime-400" style={{ width: `${ratio}%` }} />
                        </div>
                      </div>
                      <span className="w-12 text-right font-medium">{item.c}</span>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Топ просматриваемых артикулов</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 pr-4">Бренд</th>
                      <th className="py-2 pr-4">Артикул</th>
                      <th className="py-2 pr-4">Просмотры</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topArticles.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2 pr-4">{item.b}</td>
                        <td className="py-2 pr-4">{item.a}</td>
                        <td className="py-2 pr-4">{item.c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Последние события */}
          {recent && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Последние события</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium mb-2">Последние поиски</div>
                    <div className="overflow-auto max-h-64 border rounded">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="py-2 px-2">Когда</th>
                            <th className="py-2 px-2">Запрос</th>
                            <th className="py-2 px-2">Результатов</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recent.searches.map((s, i) => (
                            <tr key={i} className="border-t">
                              <td className="py-1 px-2 whitespace-nowrap">{new Date(s.createdAt).toLocaleString('ru-RU')}</td>
                              <td className="py-1 px-2 truncate max-w-[240px]" title={s.query}>{s.query}</td>
                              <td className="py-1 px-2 text-right">{s.resultsCount ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Последние открытия карточек</div>
                    <div className="overflow-auto max-h-64 border rounded">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="py-2 px-2">Когда</th>
                            <th className="py-2 px-2">Бренд</th>
                            <th className="py-2 px-2">Артикул</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recent.views.map((v, i) => (
                            <tr key={i} className="border-t">
                              <td className="py-1 px-2 whitespace-nowrap">{new Date(v.createdAt).toLocaleString('ru-RU')}</td>
                              <td className="py-1 px-2">{v.brand || '-'}</td>
                              <td className="py-1 px-2">{v.article || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </main>
  )
}
