"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import toast from 'react-hot-toast'

type OzonItem = {
  id: string
  name: string
  brand?: string
  oem?: string
  price?: number
  images: string[]
  attributes?: Record<string, string>
}

type MatchMap = Record<string, { id: string; name: string }>

export default function OzonPage() {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<OzonItem[]>([])
  const [matches, setMatches] = useState<MatchMap>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [lastId, setLastId] = useState<string | undefined>('')
  const [total, setTotal] = useState<number | undefined>(undefined)

  const selectedItems = useMemo(() => items.filter(i => selected[i.id]), [items, selected])

  const loadMatches = useCallback(async (data: OzonItem[]) => {
    const articles = data.map(i => (i.oem || '').trim()).filter(Boolean)
    if (!articles.length) { setMatches({}); return }
    try {
      const res = await fetch('/api/ozon/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles }),
      })
      if (res.ok) {
        const json = await res.json()
        setMatches(json.matches || {})
      }
    } catch (_) {}
  }, [])

  const onSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const qs = q.trim()
      const url = qs ? `/api/ozon/search?q=${encodeURIComponent(qs)}&limit=30` : '/api/ozon/search?limit=30'
      const res = await fetch(url, { cache: 'no-store' })
      const json = await res.json()
      setItems(json.items || [])
      setLastId(json.last_id || undefined)
      setTotal(json.total)
      setSelected({})
      await loadMatches(json.items || [])
    } catch (e: any) {
      const msg = e?.message || 'Не удалось выполнить поиск'
      setMessage(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [q, loadMatches])

  // initial load: show all products
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/ozon/search?limit=30', { cache: 'no-store' })
        const json = await res.json()
        setItems(json.items || [])
        setLastId(json.last_id || undefined)
        setTotal(json.total)
        setSelected({})
        await loadMatches(json.items || [])
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMore = useCallback(async () => {
    if (!lastId) return
    setLoading(true)
    setMessage(null)
    try {
      const qs = q.trim()
      const url = `/api/ozon/search?limit=30&last_id=${encodeURIComponent(lastId)}${qs ? `&q=${encodeURIComponent(qs)}` : ''}`
      const res = await fetch(url, { cache: 'no-store' })
      const json = await res.json()
      const newItems: OzonItem[] = json.items || []
      setItems(prev => [...prev, ...newItems])
      setLastId(json.last_id || undefined)
      setTotal(json.total)
      await loadMatches(newItems)
    } catch (e: any) {
      const msg = e?.message || 'Не удалось загрузить ещё'
      setMessage(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [lastId, q, loadMatches])

  const toggleAll = (checked: boolean) => {
    const map: Record<string, boolean> = {}
    for (const it of items) map[it.id] = checked
    setSelected(map)
  }

  const importSelected = useCallback(async (mode: 'new' | 'auto' | 'update') => {
    if (!selectedItems.length) return
    setActionLoading(true)
    setMessage(null)
    try {
      const payload = {
        items: selectedItems.map((i) => ({
          id: i.id,
          name: i.name,
          brand: i.brand,
          oem: i.oem,
          price: i.price,
          images: i.images || [],
          attributes: i.attributes || {},
          mode,
        })),
      }
      const res = await fetch('/api/ozon/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Импорт завершился с ошибкой')
      const ok = (json.results || []).filter((r: any) => r.status === 'created' || r.status === 'updated').length
      const okMsg = `Готово: ${ok} из ${selectedItems.length}`
      setMessage(okMsg)
      toast.success(okMsg)
      // Refresh matches if auto/update mutated database
      await loadMatches(items)
    } catch (e: any) {
      const msg = e?.message || 'Импорт не удался'
      setMessage(msg)
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }, [selectedItems, items, loadMatches])

  useEffect(() => {
    setMessage(null)
  }, [q])

  // Auto-hide inline message
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 2500)
    return () => clearTimeout(t)
  }, [message])

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ozon: Поиск и импорт товаров</CardTitle>
          <CardDescription>
            Найдите товары по OEM/артикулу производителя. Можно массово импортировать и обновлять. Фотографии при импорте сохраняются в S3.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSearch} className="flex gap-3 items-end flex-wrap">
            <div className="grid gap-2">
              <Label htmlFor="oem">OEM/Артикул</Label>
              <Input id="oem" placeholder="например, 06A145710P" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading}>{loading ? 'Ищу…' : 'Найти'}</Button>
            {items.length > 0 && (
              <>
                <Button type="button" variant="outline" onClick={() => toggleAll(true)}>Выделить все</Button>
                <Button type="button" variant="outline" onClick={() => toggleAll(false)}>Снять выделение</Button>
              </>
            )}
          </form>
          {message && <div className="mt-3 text-sm text-muted-foreground">{message}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Результаты</CardTitle>
          <CardDescription>
            Выберите позиции и выполните действие: импорт как новые или обновить существующие (по артикулу).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3 items-center">
            <Button size="sm" disabled={!selectedItems.length || actionLoading} onClick={() => importSelected('new')}>Импортировать как новые</Button>
            <Button size="sm" variant="secondary" disabled={!selectedItems.length || actionLoading} onClick={() => importSelected('auto')}>Обновить по совпадению артикула</Button>
            <div className="ml-auto text-sm text-muted-foreground">
              {typeof total === 'number' ? `Всего: ${total}` : null}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Фото</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Бренд</TableHead>
                <TableHead>OEM</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>В каталоге</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={7}>Загрузка…</TableCell></TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={7}>Нет данных</TableCell></TableRow>
              )}
              {!loading && items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <input type="checkbox" checked={!!selected[it.id]} onChange={(e) => setSelected({ ...selected, [it.id]: e.target.checked })} />
                  </TableCell>
                  <TableCell>
                    {it.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.images[0]} alt={it.name} className="w-12 h-12 object-cover rounded border" />
                    ) : '—'}
                  </TableCell>
                  <TableCell className="max-w-[360px] truncate" title={it.name}>{it.name}</TableCell>
                  <TableCell>{it.brand || '—'}</TableCell>
                  <TableCell>{it.oem || '—'}</TableCell>
                  <TableCell>{typeof it.price === 'number' ? `${Math.round(it.price)} ₽` : '—'}</TableCell>
                  <TableCell>
                    {it.oem && matches[it.oem] ? (
                      <span className="text-green-600">Да</span>
                    ) : (
                      <span className="text-muted-foreground">Нет</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={loadMore} disabled={loading || !lastId}>Показать ещё</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
