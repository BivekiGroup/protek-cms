"use client"

import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'

export default function ZzapStatsPage() {
  const [article, setArticle] = useState('')
  const [selector, setSelector] = useState('')
  const [brand, setBrand] = useState('')
  const [loading, setLoading] = useState(false)
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState(false)
  const [openDirect, setOpenDirect] = useState(true)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [offers, setOffers] = useState<Array<{ price?: number; currency?: string; raw?: string }>>([])
  const [offersLoading, setOffersLoading] = useState(false)
  const [offersError, setOffersError] = useState<string | null>(null)
  const [chartPoints, setChartPoints] = useState<Array<{ year: number; month: number; value: number }>>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)
  const [chartReason, setChartReason] = useState<string | null>(null)
  const [chartLogs, setChartLogs] = useState<string[]>([])
  const [chartObserved, setChartObserved] = useState<Array<{ url: string; len?: number; ct?: string; variant?: string }>>([])
  const [chartObservedNet, setChartObservedNet] = useState<Array<{ url: string; method?: string; status?: number; type?: string; ct?: string; len?: number }>>([])
  const [postRequests, setPostRequests] = useState<Array<{ url: string; method: string; headers: Record<string, string>; body: string; timestamp: number; status?: number }>>([])
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize] = useState(20)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [query, setQuery] = useState('')

  // Batch report state
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [periodFrom, setPeriodFrom] = useState<string>('') // YYYY-MM-01
  const [periodTo, setPeriodTo] = useState<string>('')
  const [jobId, setJobId] = useState<string>('')
  const [jobStatus, setJobStatus] = useState<string>('')
  const [jobProcessed, setJobProcessed] = useState<number>(0)
  const [jobTotal, setJobTotal] = useState<number>(0)
  const [jobResultUrl, setJobResultUrl] = useState<string>('')
  const [jobError, setJobError] = useState<string>('')
  const [reportRunning, setReportRunning] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [reportHistory, setReportHistory] = useState<any[]>([])
  const [stoppingId, setStoppingId] = useState<string>('')
  const sseRef = (typeof window !== 'undefined') ? (require('react').useRef as typeof useRef)<EventSource | null>(null) : ({ current: null } as any)
  const sseJobRef = (typeof window !== 'undefined') ? (require('react').useRef as typeof useRef)<string>('') : ({ current: '' } as any)

  const statusRu = useCallback((s?: string) => {
    switch ((s || '').toLowerCase()) {
      case 'pending': return 'В очереди'
      case 'running': return 'Выполняется'
      case 'done': return 'Готово'
      case 'canceled': return 'Отменено'
      case 'failed':
      case 'error': return 'Ошибка'
      default: return s || '—'
    }
  }, [])

  const loadReportHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/zzap/report/history?limit=20', { cache: 'no-store' })
      const j = await res.json().catch(() => null)
      if (j?.ok && Array.isArray(j.items)) setReportHistory(j.items)
    } catch {}
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      setHistoryError(null)
      const params = new URLSearchParams()
      params.set('page', String(historyPage))
      params.set('pageSize', String(historyPageSize))
      if (query.trim()) params.set('q', query.trim())
      const res = await fetch(`/api/zzap/history?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`History error ${res.status}`)
      const data = await res.json()
      setHistory(data.items || [])
      setHistoryTotal(data.total || 0)
    } catch (e: any) {
      setHistoryError(e?.message || 'Не удалось получить историю')
    } finally {
      setHistoryLoading(false)
    }
  }, [historyPage, historyPageSize, query])

  // initial load
  useEffect(() => { loadHistory(); loadReportHistory() }, [loadHistory, loadReportHistory])
  // Убрали polling истории по просьбе: обновляется через явные события (создание/завершение/SSE)

  // SSE progress: subscribe when we have a jobId
  useEffect(() => {
    if (!jobId) {
      try { sseRef.current?.close() } catch {}
      sseRef.current = null
      sseJobRef.current = ''
      return
    }
    if (sseRef.current && sseJobRef.current === jobId) return
    try { sseRef.current?.close() } catch {}
    sseRef.current = null
    const es = new EventSource(`/api/zzap/report/stream?id=${encodeURIComponent(jobId)}`)
    sseRef.current = es
    sseJobRef.current = jobId
    setReportRunning(true)
    es.onmessage = (ev) => {
      try {
        const j = JSON.parse(ev.data || '{}')
        if (typeof j.processed === 'number') setJobProcessed(j.processed)
        if (typeof j.total === 'number') setJobTotal(j.total)
        if (typeof j.status === 'string') setJobStatus(j.status)
        if (typeof j.resultFile === 'string' && j.resultFile) setJobResultUrl(j.resultFile)
        if (['done','failed','error','canceled'].includes((j.status || '').toLowerCase())) {
          setReportRunning(false)
          loadReportHistory()
          try { es.close() } catch {}
          sseRef.current = null
          sseJobRef.current = ''
        }
      } catch {}
    }
    es.addEventListener('error', () => {})
    return () => { try { es.close() } catch {}; sseRef.current = null }
  }, [jobId, loadReportHistory])

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (openDirect && article.trim()) {
      const base = 'https://www.zzap.ru'
      const b = brand.trim()
      const url = b
        ? `${base}/public/search.aspx#rawdata=${encodeURIComponent(article)}&class_man=${encodeURIComponent(b)}&partnumber=${encodeURIComponent(article)}`
        : `${base}/public/search.aspx#rawdata=${encodeURIComponent(article)}`
      window.location.assign(url)
      return
    }
    setLoading(true)
    setError(null)
    setImgSrc(null)
    setOffers([])
    setOffersError(null)
    try {
      const params = new URLSearchParams({ article })
      if (brand.trim()) params.set('brand', brand.trim())
      if (selector) params.set('selector', selector)
      if (debug) params.set('debug', '1')

      // Fire screenshot, price extraction and chart data capture in parallel
      setOffersLoading(true)
      setChartLoading(true)
      setChartReason(null)
      setChartLogs([])
      setChartObserved([])
      setChartObservedNet([])
      setPostRequests([])
      const withStatsParams = new URLSearchParams(params)
      withStatsParams.set('withStats', '1')
      const [shotRes, pricesRes] = await Promise.all([
        fetch(`/api/zzap/screenshot?${withStatsParams.toString()}`),
        fetch(`/api/zzap/prices?${new URLSearchParams({ article, ...(brand.trim() ? { brand: brand.trim() } : {}), ...(debug ? { debug: '1' } : {}) }).toString()}`)
      ])

      // Handle screenshot
      const shotCT = shotRes.headers.get('content-type') || ''
      if (shotRes.ok && shotCT.includes('application/json')) {
        const data = await shotRes.json().catch(() => ({}))
        if (data?.ok) {
          if (data?.imageUrl) setImgSrc(String(data.imageUrl))
          if (Array.isArray(data?.points)) setChartPoints(data.points)
          if (Array.isArray(data?.logs)) setChartLogs(data.logs.map((x: any) => String(x)))
          if (Array.isArray(data?.observed)) setChartObserved(data.observed.map((o: any) => ({ url: String(o.url), len: Number(o.len)||0, ct: o.contentType ? String(o.contentType) : undefined, variant: o.variant ? String(o.variant) : undefined })))
          if (Array.isArray(data?.postRequests)) setPostRequests(data.postRequests)
          loadHistory()
        } else {
          throw new Error(data?.error || `Ошибка ${shotRes.status}`)
        }
      } else if (shotRes.ok && shotCT.includes('image/png')) {
        const blob = await shotRes.blob()
        const url = URL.createObjectURL(blob)
        setImgSrc(url)
        setDebugInfo(null)
        loadHistory()
      } else {
        const data = await shotRes.json().catch(() => ({}))
        if (debug) {
          setDebugInfo(data)
          if (!shotRes.ok || data?.ok === false) throw new Error(data?.error || `Ошибка ${shotRes.status}`)
        } else {
          throw new Error(data?.error || `Ошибка ${shotRes.status}`)
        }
      }

      // Handle offers
      try {
        const j = await pricesRes.json().catch(() => null)
        if (pricesRes.ok && j?.ok && Array.isArray(j.offers)) {
          setOffers(j.offers.slice(0, 3))
        } else {
          setOffersError(j?.error || `Ошибка получения цен ${pricesRes.status}`)
        }
      } catch (e: any) {
        setOffersError(e?.message || 'Ошибка получения цен')
      } finally {
        setOffersLoading(false)
      }

      // Chart data already comes via screenshot withStats
      setChartLoading(false)
    } catch (err: any) {
      setError(err.message || 'Не удалось получить скриншот')
    } finally {
      setLoading(false)
    }
  }, [article, selector, debug, brand, openDirect])

  return (
    <div className="p-6">
      {/* Batch report */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>ZZAP: массовый отчёт по файлу</CardTitle>
          <CardDescription>
            Загрузите Excel/CSV с колонками «Артикул» и «Бренд», укажите период и получите Excel с ценами первых 3 предложений и статистикой запросов по месяцам.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Файл (XLSX/CSV)</Label>
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setReportFile(e.target.files?.[0] || null)} />
            </div>
            <div className="grid gap-2">
              <Label>Период (с)</Label>
              <Input type="month" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Период (по)</Label>
              <Input type="month" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  try {
                    setJobError('')
                    setJobId('')
                    setJobResultUrl('')
                    setJobProcessed(0)
                    setJobTotal(0)
                    if (!reportFile) return
                    if (!periodFrom || !periodTo) { setJobError('Укажите период'); return }
                    const form = new FormData()
                    form.append('file', reportFile)
                    // Convert YYYY-MM to first day for server
                    const pf = `${periodFrom}-01`
                    const pt = `${periodTo}-01`
                    form.append('periodFrom', pf)
                    form.append('periodTo', pt)
                  const res = await fetch('/api/zzap/report/start', { method: 'POST', body: form })
                  const data = await res.json()
                  if (!res.ok || !data?.ok) throw new Error(data?.error || `Ошибка ${res.status}`)
                  setJobId(data.jobId)
                  setJobTotal(data.total || 0)
                  // ensure new job appears immediately in the list
                  loadReportHistory()
                  // SSE subscription will pick it up and update progress
                  setReportRunning(true)
                } catch (e: any) {
                  setJobError(e?.message || String(e))
                }
              }}
              disabled={!reportFile || !periodFrom || !periodTo || reportRunning}
            >
              Создать отчёт
            </Button>
            {jobId && !reportRunning && (
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!jobId) return
                  setReportRunning(true)
                  try {
                    // Пинаем процесс один раз — фоновой воркер продолжит
                    await fetch(`/api/zzap/report/process?id=${jobId}&batch=5`, { method: 'POST' })
                  } catch (e: any) {
                    setJobError(e?.message || String(e))
                  } finally {
                    // Дальше состояние обновит SSE; история подхватится при изменении статуса
                  }
                }}
              >
                Запустить обработку
              </Button>
            )}
            {jobId && (reportRunning || ['pending','running'].includes(jobStatus)) && (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!jobId) return
                  try {
                    setStopping(true)
                    await fetch(`/api/zzap/report/stop?id=${jobId}`, { method: 'POST' })
                    const st = await fetch(`/api/zzap/report/status?id=${jobId}`).then(r=>r.json()).catch(()=>null)
                    if (st?.ok) {
                      setJobStatus(st.status)
                      setJobProcessed(st.processed || 0)
                    }
                  } finally {
                    setStopping(false)
                    setReportRunning(false)
                    loadHistory()
                  }
                }}
                disabled={stopping}
              >
                Остановить
              </Button>
            )}
          </div>
          {(jobId || jobError) && (
            <div className="text-sm">
              {jobError && <div className="text-red-600">Ошибка: {jobError}</div>}
              {jobId && (
                <div className="space-y-1">
                  <div>Задача: <span className="font-mono">{jobId}</span></div>
                  <div>Статус: {statusRu(jobStatus)}; Прогресс: {jobProcessed}/{jobTotal}</div>
                  <div className="flex items-center gap-3 max-w-md mt-1">
                    <Progress value={jobTotal ? (jobProcessed / jobTotal) * 100 : 0} />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(jobTotal ? (jobProcessed / jobTotal) * 100 : 0)}%
                    </span>
                  </div>
                  {jobResultUrl && (
                    <div>
                      <a className="text-blue-600 underline" href={jobResultUrl} target="_blank" rel="noreferrer">Скачать результат (XLSX)</a>
                    </div>
                  )}
                  {!jobResultUrl && !reportRunning && jobProcessed > 0 && jobProcessed === jobTotal && ['error','failed'].includes((jobStatus||'').toLowerCase()) && (
                    <div>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (!jobId) return
                          try {
                            const res = await fetch(`/api/zzap/report/finalize?id=${jobId}`, { method: 'POST' })
                            const j = await res.json().catch(() => ({}))
                            if (!res.ok || j?.ok === false) throw new Error(j?.error || 'Не удалось сформировать XLSX')
                            if (j?.resultFile) setJobResultUrl(j.resultFile)
                            setJobStatus('done')
                            await loadReportHistory()
                          } catch (e: any) {
                            setJobError(e?.message || String(e))
                          }
                        }}
                      >
                        Сформировать XLSX из готовых результатов
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>ZZAP: скриншот графика статистики</CardTitle>
          <CardDescription>
            Введите артикул, сервис авторизуется на zzap.ru и вернёт PNG скриншот графика.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-1">
              <Label htmlFor="article">Артикул</Label>
              <Input id="article" value={article} onChange={(e) => setArticle(e.target.value)} placeholder="например, 06A145710P" required />
            </div>
            <div className="grid gap-2 sm:col-span-1">
              <Label htmlFor="brand">Бренд (опционально)</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="например, SACHS" />
            </div>
            <div className="grid gap-2 sm:col-span-1">
              <Label htmlFor="selector">CSS селектор (опционально)</Label>
              <Input id="selector" value={selector} onChange={(e) => setSelector(e.target.value)} placeholder="например, .chart-container" />
            </div>
            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input id="openDirect" type="checkbox" checked={openDirect} onChange={(e) => setOpenDirect(e.target.checked)} />
                Открывать напрямую (без скрина)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input id="debug" type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
                Отладочный JSON вместо PNG
              </label>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                const base = 'https://www.zzap.ru'
                const url = brand.trim()
                  ? `${base}/public/search.aspx#rawdata=${encodeURIComponent(article)}&class_man=${encodeURIComponent(brand.trim())}&partnumber=${encodeURIComponent(article)}`
                  : `${base}/public/search.aspx#rawdata=${encodeURIComponent(article)}`
                window.location.assign(url)
              }} disabled={!article.trim()}>
                Открыть ссылку ZZAP
              </Button>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading || !article}>
                {loading ? 'Получаю…' : 'Получить скрин графика'}
              </Button>
            </div>
          </form>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {(imgSrc || offersLoading || offers.length > 0 || offersError || chartLoading || chartPoints.length > 0 || chartError) && (
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                {imgSrc && (
                  <div>
                    <h3 className="mb-2 font-medium">Результат</h3>
                    <img src={imgSrc} alt="Скриншот графика ZZAP" className="max-w-full border rounded-md" />
                  </div>
                )}
              </div>
              <div className="sm:col-span-1">
                <h3 className="mb-2 font-medium">Первые 3 предложения</h3>
                {offersLoading && <div className="text-sm text-muted-foreground">Загружаю цены…</div>}
                {offersError && <div className="text-sm text-red-600">{offersError}</div>}
                {!offersLoading && !offersError && offers.length === 0 && (
                  <div className="text-sm text-muted-foreground">Нет данных</div>
                )}
                <ul className="space-y-2">
                  {offers.slice(0,3).map((o, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">#{i+1}:</span>{' '}
                      {typeof o.price === 'number' ? o.price.toLocaleString('ru-RU') : (o.raw || '—')}{' '}
                      {o.currency ? o.currency : ''}
                    </li>
                  ))}
                </ul>

                <div className="mt-4">
                  <h3 className="mb-2 font-medium">Ежемесячная статистика</h3>
                  {chartLoading && <div className="text-sm text-muted-foreground">Загружаю…</div>}
                  {chartError && <div className="text-sm text-red-600">{chartError}</div>}
                  {!chartLoading && !chartError && chartPoints.length === 0 && (
                    <div className="text-sm text-muted-foreground">Нет данных{chartReason ? ` — причина: ${chartReason}` : ''}</div>
                  )}
                  {chartPoints.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {chartPoints.map((p, idx) => (
                        <li key={`${p.year}-${p.month}-${idx}`}>
                          {String(p.month).padStart(2, '0')}.{p.year}: {p.value}
                        </li>
                      ))}
                    </ul>
                  )}
                  {(!chartLoading) && (chartError || chartReason || chartLogs.length > 0 || chartObserved.length > 0 || postRequests.length > 0) && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer select-none">Логи статистики</summary>
                      <div className="mt-1 space-y-2">
                        <pre className="whitespace-pre-wrap bg-muted p-2 rounded-md overflow-auto max-h-[30vh]">{[chartError ? `error: ${chartError}` : null, chartReason ? `reason: ${chartReason}` : null, ...(chartLogs || [])].filter(Boolean).join('\n')}</pre>
                        {postRequests.length > 0 && (
                          <div>
                            <div className="mb-1 font-medium text-orange-600">POST-запросы (логируются сразу)</div>
                            <ul className="space-y-1">
                              {postRequests.map((req, i) => (
                                <li key={`post-${i}`} className="break-all border-l-2 border-orange-200 pl-2">
                                  <div className="font-mono text-xs">
                                    <span className="text-orange-600 font-semibold">{req.method}</span> <a className="text-blue-600 underline" href={req.url} target="_blank" rel="noreferrer">{req.url}</a>
                                    {req.status && <span className="text-green-600 ml-2">(→ {req.status})</span>}
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    Body: {req.body ? `${req.body.length} bytes` : 'empty'} | 
                                    Headers: {Object.keys(req.headers || {}).length} | 
                                    Time: {new Date(req.timestamp).toLocaleTimeString('ru-RU')}
                                  </div>
                                  {req.body && req.body.length > 0 && req.body.length < 500 && (
                                    <details className="mt-1">
                                      <summary className="cursor-pointer text-muted-foreground text-xs">Показать тело запроса</summary>
                                      <pre className="mt-1 bg-gray-50 p-1 rounded text-xs overflow-auto max-h-20">{req.body}</pre>
                                    </details>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {chartObserved.length > 0 && (
                          <div>
                            <div className="mb-1 font-medium">Найденные API вызовы</div>
                            <ul className="space-y-1">
                              {chartObserved.map((o, i) => (
                                <li key={i} className="break-all">
                                  <a className="text-blue-600 underline" href={o.url} target="_blank" rel="noreferrer">{o.url}</a>
                                  <span className="text-muted-foreground"> {o.variant ? `(${o.variant})` : ''} {o.ct ? `— ${o.ct}` : ''} {o.len ? `— ${o.len} bytes` : ''}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {chartObservedNet.length > 0 && (
                          <div>
                            <div className="mt-2 mb-1 font-medium">Все сетевые вызовы (zzap.ru)</div>
                            <ul className="space-y-1">
                              {chartObservedNet.map((o, i) => (
                                <li key={`net-${i}`} className="break-all">
                                  <span className="text-muted-foreground">[{o.method || 'GET'} {o.status || ''} {o.type || ''}] </span>
                                  <a className="text-blue-600 underline" href={o.url} target="_blank" rel="noreferrer">{o.url}</a>
                                  <span className="text-muted-foreground"> {o.ct ? `— ${o.ct}` : ''} {typeof o.len === 'number' ? `— ${o.len} bytes` : ''}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
          {debugInfo && (
            <pre className="mt-2 whitespace-pre-wrap text-xs bg-muted p-3 rounded-md overflow-auto max-h-[50vh]">
{JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>История отчётов</CardTitle>
          <CardDescription>Последние задачи формирования XLSX. Ссылки ведут в S3.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Прогресс</TableHead>
                <TableHead>Файл</TableHead>
                <TableHead>Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportHistory.length === 0 && (
                <TableRow><TableCell colSpan={5}>Пока нет задач</TableCell></TableRow>
              )}
              {reportHistory.map((j) => (
                <TableRow key={j.id}>
                  <TableCell>{j.createdAt ? format(new Date(j.createdAt), 'dd.MM.yyyy HH:mm') : '—'}</TableCell>
                  <TableCell>{statusRu(j.status)}</TableCell>
                  <TableCell>{j.processed}/{j.total}</TableCell>
                  <TableCell>{j.resultFile ? <a className="text-blue-600 underline" href={j.resultFile} target="_blank" rel="noreferrer">Скачать</a> : '—'}</TableCell>
                  <TableCell>
                    {(['pending','running'].includes(j.status)) ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={stoppingId === j.id}
                        onClick={async () => {
                          try {
                            setStoppingId(j.id)
                            await fetch(`/api/zzap/report/stop?id=${j.id}`, { method: 'POST' })
                            await loadReportHistory()
                            // sync the active job status if it is the same
                            if (jobId === j.id) {
                              const st = await fetch(`/api/zzap/report/status?id=${j.id}`).then(r=>r.json()).catch(()=>null)
                              if (st?.ok) {
                                setJobStatus(st.status)
                                setJobProcessed(st.processed || 0)
                              }
                              setReportRunning(false)
                            }
                          } finally {
                            setStoppingId('')
                          }
                        }}
                      >
                        Остановить
                      </Button>
                    ) : (!j.resultFile && j.processed > 0 && j.processed === j.total && ['error','failed'].includes((j.status||'').toLowerCase())) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/zzap/report/finalize?id=${j.id}`, { method: 'POST' })
                            const x = await res.json().catch(()=>({}))
                            if (!res.ok || x?.ok === false) throw new Error(x?.error || 'Не удалось сформировать XLSX')
                            await loadReportHistory()
                            if (jobId === j.id && x?.resultFile) { setJobResultUrl(x.resultFile); setJobStatus('done') }
                          } catch {}
                        }}
                      >
                        Сформировать XLSX
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>История запросов</CardTitle>
          <CardDescription>Последние 20 запросов ZZAP. Кликните по ссылке, чтобы открыть изображение.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Input placeholder="Поиск по артикулу" value={query} onChange={(e) => { setQuery(e.target.value); setHistoryPage(1); }} className="max-w-xs" />
            <Button variant="outline" onClick={() => { setHistoryPage(1); loadHistory() }} disabled={historyLoading}>Найти</Button>
          </div>
          {historyError && <p className="text-sm text-red-600">{historyError}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Артикул</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>URL статистики</TableHead>
                <TableHead>Изображение</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyLoading && (
                <TableRow><TableCell colSpan={5}>Загрузка…</TableCell></TableRow>
              )}
              {!historyLoading && history.length === 0 && (
                <TableRow><TableCell colSpan={5}>Пусто</TableCell></TableRow>
              )}
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.createdAt ? format(new Date(item.createdAt), 'dd.MM.yyyy HH:mm') : '—'}</TableCell>
                  <TableCell>{item.article}</TableCell>
                  <TableCell>{item.ok ? 'OK' : 'ERR'}</TableCell>
                  <TableCell className="max-w-[280px] truncate">
                    {item.statsUrl ? <a className="text-blue-600 underline" href={item.statsUrl} target="_blank" rel="noreferrer">{item.statsUrl}</a> : '—'}
                  </TableCell>
                  <TableCell>
                    {item.imageUrl ? <a className="text-blue-600 underline" href={item.imageUrl} target="_blank" rel="noreferrer">Открыть</a> : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Всего: {historyTotal}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage === 1 || historyLoading}>Назад</Button>
              <div className="text-sm">Стр. {historyPage} / {Math.max(1, Math.ceil(historyTotal / historyPageSize))}</div>
              <Button variant="outline" size="sm" onClick={() => setHistoryPage((p) => p + 1)} disabled={historyPage >= Math.ceil(historyTotal / historyPageSize) || historyLoading}>Вперёд</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
