"use client"

import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  
  // Новые состояния для второй карточки
  const [top3Article, setTop3Article] = useState('')
  const [top3Selector, setTop3Selector] = useState('')
  const [top3Loading, setTop3Loading] = useState(false)
  const [top3Prices, setTop3Prices] = useState<any[]>([])
  const [top3Error, setTop3Error] = useState<string | null>(null)
  const [top3Brand, setTop3Brand] = useState('')

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

  const onTop3Submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setTop3Loading(true)
    setTop3Error(null)
    setTop3Prices([])
    try {
      const params = new URLSearchParams({ article: top3Article })
      if (top3Selector) params.set('selector', top3Selector)
      if (top3Brand) params.set('brand', top3Brand)
      const res = await fetch(`/api/zzap/top3?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setTop3Prices(data.prices || [])
      } else {
        throw new Error(data?.error || `Ошибка ${res.status}`)
      }
    } catch (err: any) {
      setTop3Error(err.message || 'Не удалось получить топ-3 цен')
    } finally {
      setTop3Loading(false)
    }
  }, [top3Article, top3Selector, top3Brand])

  return (
    <div className="p-6">
      <div className="flex gap-6">
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

        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>ZZAP: топ-3 детали</CardTitle>
            <CardDescription>
              Получите топ-3 детали по популярности или другим критериям.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onTop3Submit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="top3-article">Артикул</Label>
                <Input 
                  id="top3-article" 
                  value={top3Article} 
                  onChange={(e) => setTop3Article(e.target.value)} 
                  placeholder="например, 06A145710P" 
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="top3-brand">Бренд (опционально)</Label>
                <Input 
                  id="top3-brand" 
                  value={top3Brand} 
                  onChange={(e) => setTop3Brand(e.target.value)} 
                  placeholder="например, SACHS" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="top3-selector">CSS селектор (опционально)</Label>
                <Input 
                  id="top3-selector" 
                  value={top3Selector} 
                  onChange={(e) => setTop3Selector(e.target.value)} 
                  placeholder=".right.dx-wrap.dxgv.pricewhitecell" 
                />
              </div>
              <div>
                <Button 
                  type="submit"
                  className="w-full" 
                  disabled={top3Loading || !top3Article}
                >
                  {top3Loading ? 'Получаю…' : 'Получить топ-3'}
                </Button>
              </div>
            </form>
            
            {top3Error && <p className="text-sm text-red-600">{top3Error}</p>}
            
            {top3Prices.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-medium">Топ-3 цены</h3>
                <div className="space-y-2">
                  {top3Prices.map((price, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-md">
                      <span className="font-medium">#{price.position}</span>
                      <span className="text-lg font-bold text-green-600">{price.price} ₽</span>
                      <span className="text-sm text-muted-foreground">{price.priceText}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
