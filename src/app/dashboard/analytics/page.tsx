"use client"
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DayPoint = { d: string; c: number }
type TopItem = { q?: string; b?: string; a?: string; c: number }

export default function AnalyticsPage() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<any>(null)
  const [kpi, setKpi] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<{ searches: any[]; views: any[] } | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch(`/api/analytics/summary?days=${days}`)
        if (!res.ok) throw new Error(`summary ${res.status}`)
        const json = await res.json()
        setData(json)
        try {
          const k = await fetch('/api/analytics/kpi', { cache: 'no-store' }).then(r => r.json())
          setKpi(k)
        } catch {}
        try {
          const r = await fetch('/api/analytics/recent?limit=20', { cache: 'no-store' }).then(r => r.json())
          if (r?.ok) setRecent({ searches: r.searches, views: r.views })
        } catch {}
      } catch (e: any) {
        setError(String(e?.message || e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [days])

  const maxSearch = useMemo(() => Math.max(1, ...(data?.searchByDay || []).map((p: DayPoint) => Number(p.c)||0)), [data])
  const maxViews = useMemo(() => Math.max(1, ...(data?.viewsByDay || []).map((p: DayPoint) => Number(p.c)||0)), [data])

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
              <ul className="text-sm space-y-2">
                {data.searchByDay?.map((p: DayPoint, i: number) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-gray-600">{new Date(p.d).toLocaleDateString('ru-RU')}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded">
                      <div className="h-2 bg-blue-500 rounded" style={{ width: `${Math.min(100, Math.round((Number(p.c)||0) / maxSearch * 100))}%` }} />
                    </div>
                    <span className="w-10 text-right">{p.c}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Просмотры карточек по дням</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                {data.viewsByDay?.map((p: DayPoint, i: number) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-gray-600">{new Date(p.d).toLocaleDateString('ru-RU')}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded">
                      <div className="h-2 bg-emerald-500 rounded" style={{ width: `${Math.min(100, Math.round((Number(p.c)||0) / maxViews * 100))}%` }} />
                    </div>
                    <span className="w-10 text-right">{p.c}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Топ запросов</CardTitle></CardHeader>
            <CardContent>
              <ol className="text-sm space-y-1">
                {data.topQueries?.map((t: TopItem, i: number) => (
                  <li key={i} className="flex justify-between border-b py-1"><span className="truncate pr-3">{t.q}</span><span className="font-medium">{t.c}</span></li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Топ брендов (поиск)</CardTitle></CardHeader>
            <CardContent>
              <ol className="text-sm space-y-1">
                {data.topBrands?.map((t: TopItem, i: number) => (
                  <li key={i} className="flex justify-between border-b py-1"><span className="truncate pr-3">{t.b}</span><span className="font-medium">{t.c}</span></li>
                ))}
              </ol>
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
                    {data.topArticles?.map((t: TopItem, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 pr-4">{t.b}</td>
                        <td className="py-2 pr-4">{t.a}</td>
                        <td className="py-2 pr-4">{t.c}</td>
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
