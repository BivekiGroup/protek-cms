"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const [jobEtaText, setJobEtaText] = useState<string>('')
  const [reportHistory, setReportHistory] = useState<any[]>([])
  const [stoppingId, setStoppingId] = useState<string>('')
  const [jobLogs, setJobLogs] = useState<string[]>([])
  const sseRef = useRef<EventSource | null>(null)
  const sseJobRef = useRef<string>('')
  const calcEtaText = useCallback((items: number) => {
    const perItemMs = 12000 + 2000 + 1500
    const total = Math.max(0, Math.ceil((items || 0) * perItemMs))
    const s = Math.round(total / 1000)
    const mm = Math.floor(s / 60)
    const ss = s % 60
    if (mm <= 0) return `~${s} сек`
    if (mm < 60) return `~${mm} мин ${ss} сек`
    const hh = Math.floor(mm / 60)
    const m2 = mm % 60
    return `~${hh} ч ${m2} мин`
  }, [])

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
    setJobLogs([])
    es.onmessage = (ev) => {
      try {
        const j = JSON.parse(ev.data || '{}')
        if (typeof j.processed === 'number') setJobProcessed(j.processed)
        if (typeof j.total === 'number') setJobTotal(j.total)
        if (typeof j.total === 'number') setJobEtaText((prev) => prev || calcEtaText(Number(j.total)))
        if (typeof j.status === 'string') setJobStatus(j.status)
        if (typeof j.resultFile === 'string' && j.resultFile) setJobResultUrl(j.resultFile)
        if (['done','failed','error','canceled'].includes((j.status || '').toLowerCase())) {
          loadReportHistory()
          setReportRunning(false)
          try { es.close() } catch {}
          sseRef.current = null
          sseJobRef.current = ''
        }
        if (typeof j.line === 'string' && j.line) {
          setJobLogs((prev) => (prev.length > 400 ? [...prev.slice(-400), j.line] : [...prev, j.line]))
        }
      } catch {}
    }
    es.addEventListener('log', (ev: MessageEvent) => {
      try {
        const j = JSON.parse((ev as any).data || '{}')
        if (typeof j.line === 'string' && j.line) {
          setJobLogs((prev) => (prev.length > 400 ? [...prev.slice(-400), j.line] : [...prev, j.line]))
        }
      } catch {}
    })
    es.addEventListener('error', () => {})
    return () => { try { es.close() } catch {}; sseRef.current = null }
  }, [jobId, loadReportHistory, sseRef, sseJobRef, calcEtaText])

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
    try {
      const params = new URLSearchParams({ article })
      if (brand.trim()) params.set('brand', brand.trim())
      if (selector) params.set('selector', selector)
      if (debug) params.set('debug', '1')
      const res = await fetch(`/api/zzap/screenshot?${params.toString()}`)
      const ct = res.headers.get('content-type') || ''
      if (res.ok && ct.includes('image/png')) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        setImgSrc(url)
        setDebugInfo(null)
        loadHistory()
      } else {
        const data = await res.json().catch(() => ({}))
        if (debug) {
          setDebugInfo(data)
          // В режиме отладки не считаем 200 ошибкой
          if (!res.ok || data?.ok === false) {
            throw new Error(data?.error || `Ошибка ${res.status}`)
          }
        } else {
          throw new Error(data?.error || `Ошибка ${res.status}`)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Не удалось получить скриншот')
    } finally {
      setLoading(false)
    }
  }, [article, selector, debug, brand, openDirect, loadHistory])

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
                    setJobEtaText('')
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
                  if (typeof data.etaText === 'string' && data.etaText) setJobEtaText(data.etaText)
                  else if (typeof data.total === 'number') setJobEtaText(calcEtaText(Number(data.total)))
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
                    await fetch(`/api/zzap/report/process?id=${jobId}`, { method: 'POST' })
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
                  <div>Статус: {statusRu(jobStatus)}; Прогресс: {jobProcessed}/{jobTotal}{jobEtaText ? `; Оценка: ${jobEtaText}` : ''}</div>
                  <div className="flex items-center gap-3 max-w-md mt-1">
                    <Progress value={jobTotal ? (jobProcessed / jobTotal) * 100 : 0} />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(jobTotal ? (jobProcessed / jobTotal) * 100 : 0)}%
                    </span>
                  </div>
                  {jobLogs.length > 0 && (
                    <div className="mt-2 p-2 bg-muted rounded border text-xs max-h-48 overflow-auto font-mono whitespace-pre-wrap">
                      {jobLogs.map((l, i) => (<div key={i}>{l}</div>))}
                    </div>
                  )}
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

      {/* Report history */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>История отчётов</CardTitle>
          <CardDescription>Последние 20 задач. Можно продолжить обработку или открыть результат.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Button variant="outline" size="sm" onClick={() => loadReportHistory()}>Обновить</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Создан</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Прогресс</TableHead>
                <TableHead>Файл</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportHistory.length === 0 && (
                <TableRow><TableCell colSpan={6}>Пусто</TableCell></TableRow>
              )}
              {reportHistory.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.createdAt ? format(new Date(r.createdAt), 'dd.MM.yyyy HH:mm') : '—'}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[220px] truncate" title={r.id}>{r.id}</TableCell>
                  <TableCell>{statusRu(r.status)}</TableCell>
                  <TableCell>{r.processed}/{r.total}</TableCell>
                  <TableCell>
                    {r.resultFile ? (
                      <a className="text-blue-600 underline" href={r.resultFile} target="_blank" rel="noreferrer">Скачать</a>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="space-x-2">
                    {(!r.resultFile && ['pending','running'].includes(String(r.status).toLowerCase())) && (
                      <Button size="sm" variant="secondary" onClick={async () => {
                        try { await fetch(`/api/zzap/report/process?id=${encodeURIComponent(r.id)}`, { method: 'POST' }) } catch {}
                        await loadReportHistory()
                      }}>Продолжить</Button>
                    )}
                    {['running'].includes(String(r.status).toLowerCase()) && (
                      <Button size="sm" variant="destructive" onClick={async () => {
                        try { await fetch(`/api/zzap/report/stop?id=${encodeURIComponent(r.id)}`, { method: 'POST' }) } catch {}
                        await loadReportHistory()
                      }}>Остановить</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          <form onSubmit={
            onSubmit
          } className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>Артикул</Label>
                <Input value={article} onChange={(e) => setArticle(e.target.value)} placeholder="например, 314125" required />
              </div>
              <div className="grid gap-1">
                <Label>Бренд (по желанию)</Label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="например, SACHS" />
              </div>
            </div>
            <div className="grid gap-1">
              <Label>CSS-селектор графика (опционально)</Label>
              <Input value={selector} onChange={(e) => setSelector(e.target.value)} placeholder="например, .highcharts-container" />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} /> Отладка
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={openDirect} onChange={(e) => setOpenDirect(e.target.checked)} /> Открывать ZZAP напрямую (вместо скриншота)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={loading}>{loading ? 'Загрузка…' : 'Получить скриншот'}</Button>
              <Button type="button" variant="outline" onClick={() => {
                if (!article.trim()) return
                const base = 'https://www.zzap.ru'
                const b = brand.trim()
                const url = b
                  ? `${base}/public/search.aspx#rawdata=${encodeURIComponent(article)}&class_man=${encodeURIComponent(b)}&partnumber=${encodeURIComponent(article)}`
                  : `${base}/public/search.aspx#rawdata=${encodeURIComponent(article)}`
                window.open(url, '_blank')
              }}>Открыть ссылку ZZAP</Button>
            </div>
          </form>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {imgSrc && (
            <div className="mt-2">
              <img src={imgSrc} alt="Скриншот графика ZZAP" className="max-w-full border rounded-md" />
            </div>
          )}
          {debug && debugInfo && (
            <pre className="text-xs bg-muted p-3 rounded border overflow-auto max-h-80">{JSON.stringify(debugInfo, null, 2)}</pre>
          )}
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
