"use client"

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  const [providers, setProviders] = useState<Record<string, boolean>>({})
  const [filterVision, setFilterVision] = useState(false)
  const [filterTools, setFilterTools] = useState(false)
  const [filterReasoning, setFilterReasoning] = useState(false)
  const [filterLongCtx, setFilterLongCtx] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    (async () => {
      try {
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
        // initialize providers map
        const prov: Record<string, boolean> = {}
        for (const m of mapped) {
          const p = m.id.split('/')[0]
          prov[p] = prov[p] ?? false
        }
        setProviders(prov)
      } catch {}
      try {
        const fav = JSON.parse(localStorage.getItem('ai_favorites') || '[]')
        if (Array.isArray(fav)) setFavorites(fav)
        const rec = JSON.parse(localStorage.getItem('ai_recent') || '[]')
        if (Array.isArray(rec)) setRecent(rec)
      } catch {}
    })()
  }, [])

  const providerList = useMemo(() => Object.keys(providers).sort(), [providers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const activeProviders = providerList.filter((p) => providers[p])
    return models.filter((m) => {
      if (activeProviders.length) {
        const prov = m.id.split('/')[0]
        if (!activeProviders.includes(prov)) return false
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
  }, [models, search, providers, providerList, filterVision, filterTools, filterReasoning, filterLongCtx])

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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Выбор модели</DialogTitle>
        </DialogHeader>
        <div className="flex gap-4">
          {/* Filters */}
          <div className="w-56 flex-none space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-medium mb-2">Провайдеры</div>
              <div className="space-y-2 max-h-48 overflow-auto pr-1">
                {providerList.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={providers[p]} onCheckedChange={(v) => setProviders((s) => ({ ...s, [p]: Boolean(v) }))} />
                    <span className="truncate">{p}</span>
                  </label>
                ))}
                {providerList.length === 0 && <div className="text-xs text-muted-foreground">нет данных</div>}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium">Возможности</div>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={filterVision} onCheckedChange={(v) => setFilterVision(Boolean(v))} />Видение</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={filterTools} onCheckedChange={(v) => setFilterTools(Boolean(v))} />Tools</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={filterReasoning} onCheckedChange={(v) => setFilterReasoning(Boolean(v))} />Reasoning</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={filterLongCtx} onCheckedChange={(v) => setFilterLongCtx(Boolean(v))} />Long context</label>
            </div>
            <div>
              <div className="text-xs font-medium mb-1">Избранное</div>
              <div className="flex flex-wrap gap-1">
                {favorites.map((id) => (
                  <Badge key={id} onClick={() => pick(id)} className="cursor-pointer" variant="secondary">{id}</Badge>
                ))}
                {favorites.length === 0 && <div className="text-xs text-muted-foreground">пусто</div>}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium mb-1">Недавние</div>
              <div className="flex flex-wrap gap-1">
                {recent.map((id) => (
                  <Badge key={id} onClick={() => pick(id)} className="cursor-pointer" variant="outline">{id}</Badge>
                ))}
                {recent.length === 0 && <div className="text-xs text-muted-foreground">—</div>}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 min-w-0">
            <ScrollArea className="h-[60vh] pr-2">
              <div className="space-y-2">
                {filtered.map((m) => {
                  const prov = m.id.split('/')[0]
                  const isFav = favorites.includes(m.id)
                  return (
                    <div key={m.id} className="border rounded-md p-3 hover:bg-muted/40 flex items-start justify-between gap-3">
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
                {filtered.length === 0 && (
                  <div className="text-sm text-muted-foreground">Ничего не найдено. Попробуйте снять фильтры.</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

