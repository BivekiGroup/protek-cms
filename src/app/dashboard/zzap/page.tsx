"use client"

import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export default function ZzapStatsPage() {
  const [article, setArticle] = useState('')
  const [selector, setSelector] = useState('')
  const [loading, setLoading] = useState(false)
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState(false)
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
  useEffect(() => { loadHistory() }, [loadHistory])

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setImgSrc(null)
    try {
      const params = new URLSearchParams({ article })
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
          throw new Error(data?.error || `Ошибка ${res.status}`)
        }
        throw new Error(data?.error || `Ошибка ${res.status}`)
      }
    } catch (err: any) {
      setError(err.message || 'Не удалось получить скриншот')
    } finally {
      setLoading(false)
    }
  }, [article, selector, debug])

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
                    let done = false
                    while (!done) {
                      const proc = await fetch(`/api/zzap/report/process?id=${jobId}&batch=5`, { method: 'POST' })
                      const j = await proc.json()
                      if (!proc.ok || j?.ok === false) throw new Error(j?.error || `Ошибка процесса`)
                      // Poll status to get current numbers and link
                      const st = await fetch(`/api/zzap/report/status?id=${jobId}`)
                      const s = await st.json()
                      if (s?.ok) {
                        setJobStatus(s.status)
                        setJobProcessed(s.processed || 0)
                        setJobTotal(s.total || 0)
                        if (s.resultFile) setJobResultUrl(s.resultFile)
                        if (s.status === 'done') { done = true; break }
                      }
                      await new Promise(r => setTimeout(r, 800))
                    }
                  } catch (e: any) {
                    setJobError(e?.message || String(e))
                  } finally {
                    setReportRunning(false)
                    loadHistory()
                  }
                }}
              >
                Запустить обработку
              </Button>
            )}
          </div>
          {(jobId || jobError) && (
            <div className="text-sm">
              {jobError && <div className="text-red-600">Ошибка: {jobError}</div>}
              {jobId && (
                <div className="space-y-1">
                  <div>Задача: <span className="font-mono">{jobId}</span></div>
                  <div>Статус: {jobStatus || '—'}; Прогресс: {jobProcessed}/{jobTotal}</div>
                  {jobResultUrl && (
                    <div>
                      <a className="text-blue-600 underline" href={jobResultUrl} target="_blank" rel="noreferrer">Скачать результат (XLSX)</a>
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
              <Label htmlFor="selector">CSS селектор (опционально)</Label>
              <Input id="selector" value={selector} onChange={(e) => setSelector(e.target.value)} placeholder="например, .chart-container" />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input id="debug" type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
              <Label htmlFor="debug">Режим отладки (вернуть детали вместо PNG)</Label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading || !article}>
                {loading ? 'Получаю…' : 'Получить скрин графика'}
              </Button>
            </div>
          </form>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {imgSrc && (
            <div className="mt-2">
              <h3 className="mb-2 font-medium">Результат</h3>
              <img src={imgSrc} alt="Скриншот графика ZZAP" className="max-w-full border rounded-md" />
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
