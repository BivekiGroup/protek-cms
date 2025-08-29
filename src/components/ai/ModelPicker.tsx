"use client"

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, Search } from 'lucide-react'

type ModelInfo = {
  id: string
  name?: string
  context_length?: number
  architecture?: { input_modalities?: string[]; output_modalities?: string[] }
  pricing?: { prompt?: string; completion?: string }
  supported_parameters?: string[]
}

export default function ModelPicker({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState<string>('all')
  const [filterVision, setFilterVision] = useState(false)
  const [filterTools, setFilterTools] = useState(false)
  const [filterReasoning, setFilterReasoning] = useState(false)
  const [filterLongCtx, setFilterLongCtx] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/ai/models', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        const list: any[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.data?.data) ? data.data.data : [])
        const mapped: ModelInfo[] = list.map((m) => ({
          id: m?.id,
          name: m?.name,
          context_length: m?.context_length,
          architecture: m?.architecture,
          pricing: m?.pricing,
          supported_parameters: m?.supported_parameters,
        })).filter((m) => m.id)
        setModels(mapped)
      } catch {}
      try {
        const fav = JSON.parse(localStorage.getItem('ai_favorites') || '[]')
        if (Array.isArray(fav)) setFavorites(fav)
        const rec = JSON.parse(localStorage.getItem('ai_recent') || '[]')
        if (Array.isArray(rec)) setRecent(rec)
      } catch {}
      finally { setLoading(false) }
    })()
  }, [])

  const providerList = useMemo(() => {
    const set = new Set<string>()
    for (const m of models) set.add(m.id.split('/')[0])
    return Array.from(set).sort()
  }, [models])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return models.filter((m) => {
      if (provider !== 'all') {
        const prov = m.id.split('/')[0]
        if (prov !== provider) return false
      }
      if (q) {
        const hay = `${m.id} ${m.name || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filterVision) {
        if (!m.architecture?.input_modalities?.includes('image')) return false
      }
      if (filterTools) {
        if (!m.supported_parameters?.includes('tools')) return false
      }
      if (filterReasoning) {
        if (!m.supported_parameters?.includes('reasoning') && !m.supported_parameters?.includes('include_reasoning')) return false
      }
      if (filterLongCtx) {
        if ((m.context_length || 0) < 200000) return false
      }
      return true
    }).slice(0, 400)
  }, [models, search, provider, filterVision, filterTools, filterReasoning, filterLongCtx])

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
    // persist recent
    try {
      const next = [id, ...recent.filter((x) => x !== id)].slice(0, 8)
      setRecent(next)
      localStorage.setItem('ai_recent', JSON.stringify(next))
    } catch {}
  }

  const toggleFavorite = (id: string) => {
    const exists = favorites.includes(id)
    const next = exists ? favorites.filter((x) => x !== id) : [id, ...favorites]
    setFavorites(next)
    try { localStorage.setItem('ai_favorites', JSON.stringify(next)) } catch {}
  }

  const current = models.find((m) => m.id === value)
  const currentLabel = current?.name || value || 'Выбрать модель'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{currentLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader>
          <DialogTitle className="px-5 pt-4">Выбор модели</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-4 space-y-3">
          {/* Top controls */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Поиск моделей..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Провайдер" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все провайдеры</SelectItem>
                {providerList.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Feature toggles */}
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2"><Checkbox checked={filterVision} onCheckedChange={(v) => setFilterVision(Boolean(v))} />Видение</label>
            <label className="flex items-center gap-2"><Checkbox checked={filterTools} onCheckedChange={(v) => setFilterTools(Boolean(v))} />Инструменты</label>
            <label className="flex items-center gap-2"><Checkbox checked={filterReasoning} onCheckedChange={(v) => setFilterReasoning(Boolean(v))} />Reasoning</label>
            <label className="flex items-center gap-2"><Checkbox checked={filterLongCtx} onCheckedChange={(v) => setFilterLongCtx(Boolean(v))} />Длинный контекст</label>
          </div>
          {/* Favorites & recent */}
          {(favorites.length > 0 || recent.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {favorites.map((id) => (
                <Badge key={id} onClick={() => pick(id)} className="cursor-pointer" variant="secondary">{id}</Badge>
              ))}
              {recent.filter((id) => !favorites.includes(id)).map((id) => (
                <Badge key={id} onClick={() => pick(id)} className="cursor-pointer" variant="outline">{id}</Badge>
              ))}
            </div>
          )}
          {/* List */}
          <ScrollArea className="h-[58vh] pr-2">
            <div className="space-y-2">
              {loading && (
                <div className="text-sm text-muted-foreground">Загрузка моделей…</div>
              )}
                {filtered.map((m) => {
                  const prov = m.id.split('/')[0]
                  const isFav = favorites.includes(m.id)
                  return (
                    <div key={m.id} className="border rounded-md p-3 hover:bg-muted/50 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <button className="text-left font-medium truncate" title={m.id} onClick={() => pick(m.id)}>{m.name || m.id}</button>
                          <Badge variant="outline" className="text-xs">{prov}</Badge>
                          {m.architecture?.input_modalities?.includes('image') && <Badge variant="secondary" className="text-xs">vision</Badge>}
                          {m.supported_parameters?.includes('tools') && <Badge variant="secondary" className="text-xs">tools</Badge>}
                          {(m.supported_parameters?.includes('reasoning') || m.supported_parameters?.includes('include_reasoning')) && <Badge variant="secondary" className="text-xs">reasoning</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">{m.id}</div>
                        <div className="text-xs mt-1 flex items-center gap-3">
                          {!!m.context_length && <span>ctx: {m.context_length.toLocaleString('ru-RU')}</span>}
                          {!!m.pricing?.prompt && <span>in: {m.pricing.prompt}</span>}
                          {!!m.pricing?.completion && <span>out: {m.pricing.completion}</span>}
                        </div>
                      </div>
                      <button className={`p-1 rounded hover:bg-muted ${isFav ? 'text-yellow-500' : 'text-muted-foreground'}`} onClick={() => toggleFavorite(m.id)} title={isFav ? 'Убрать из избранного' : 'В избранное'}>
                        <Star className="h-4 w-4" fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  )
                })}
                {filtered.length === 0 && !loading && (
                  <div className="text-sm text-muted-foreground">Ничего не найдено. Попробуйте снять фильтры.</div>
                )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
