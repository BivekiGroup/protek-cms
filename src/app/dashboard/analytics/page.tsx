"use client"
import { useEffect, useState } from 'react'

type DayPoint = { d: string; c: number }
type TopItem = { q?: string; b?: string; a?: string; c: number }

export default function AnalyticsPage() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch(`/api/analytics/summary?days=${days}`)
        const json = await res.json()
        setData(json)
      } catch (e: any) {
        setError(String(e?.message || e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [days])

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Аналитика</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Дней:</label>
          <select className="border rounded px-2 py-1" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>1</option>
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
            <option value={90}>90</option>
          </select>
        </div>
      </div>

      {loading && <div>Загрузка...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="border rounded p-4">
            <h2 className="text-lg mb-2">Поисковые запросы по дням</h2>
            <ul className="text-sm space-y-1">
              {data.searchByDay?.map((p: DayPoint, i: number) => (
                <li key={i} className="flex justify-between"><span>{new Date(p.d).toLocaleDateString('ru-RU')}</span><span>{p.c}</span></li>
              ))}
            </ul>
          </section>

          <section className="border rounded p-4">
            <h2 className="text-lg mb-2">Просмотры карточек по дням</h2>
            <ul className="text-sm space-y-1">
              {data.viewsByDay?.map((p: DayPoint, i: number) => (
                <li key={i} className="flex justify-between"><span>{new Date(p.d).toLocaleDateString('ru-RU')}</span><span>{p.c}</span></li>
              ))}
            </ul>
          </section>

          <section className="border rounded p-4">
            <h2 className="text-lg mb-2">Топ запросов</h2>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              {data.topQueries?.map((t: TopItem, i: number) => (
                <li key={i} className="flex justify-between"><span>{t.q}</span><span>{t.c}</span></li>
              ))}
            </ol>
          </section>

          <section className="border rounded p-4">
            <h2 className="text-lg mb-2">Топ брендов (поиск)</h2>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              {data.topBrands?.map((t: TopItem, i: number) => (
                <li key={i} className="flex justify-between"><span>{t.b}</span><span>{t.c}</span></li>
              ))}
            </ol>
          </section>

          <section className="border rounded p-4 lg:col-span-2">
            <h2 className="text-lg mb-2">Топ просматриваемых артикулов</h2>
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
          </section>
        </div>
      )}
    </main>
  )
}


