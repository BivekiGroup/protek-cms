"use client"

import { useEffect, useState } from 'react'
import { useMutation } from '@apollo/client'
import { CREATE_NEWS, UPDATE_NEWS } from '@/lib/graphql/mutations'
import ModelPicker from '@/components/ai/ModelPicker'
import { Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { FileUpload } from '@/components/ui/file-upload'
import RichTextEditor from '@/components/editor/RichTextEditor'
import { toast } from 'sonner'
import Image from 'next/image'

type NewsItem = {
  id?: string
  title: string
  category: string
  shortDescription: string
  coverImageUrl: string
  coverImageAlt?: string
  contentHtml: string
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt?: string | null
}

const defaultState: NewsItem = {
  title: '',
  category: 'Новости компании',
  shortDescription: '',
  coverImageUrl: '',
  coverImageAlt: '',
  contentHtml: '<p></p>',
  status: 'DRAFT',
  publishedAt: null,
}

import { useRouter } from 'next/navigation'

const toLocalInputValue = (iso?: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

const fromLocalInputValue = (value: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export default function NewsForm({ initial }: { initial?: Partial<NewsItem> }) {
  const router = useRouter()
  const [state, setState] = useState<NewsItem>({ ...defaultState, ...initial })

  useEffect(() => {
    if (initial) setState(prev => ({ ...prev, ...initial }))
  }, [initial])

  const [createNews, { loading: creating }] = useMutation(CREATE_NEWS, {
    onCompleted: ({ createNews }) => {
      toast.success('Новость создана')
      router.push(`/dashboard/news/${createNews.id}`)
    },
    onError: (error) => toast.error(error.message || 'Ошибка создания')
  })

  const [updateNews, { loading: updating }] = useMutation(UPDATE_NEWS, {
    onCompleted: () => {
      toast.success('Новость сохранена')
      // stay on page
    },
    onError: (error) => toast.error(error.message || 'Ошибка сохранения')
  })

  const busy = creating || updating

  // AI generation controls
  const [model, setModel] = useState<string | undefined>(undefined)
  const [temperature, setTemperature] = useState<number>(0.3)
  const [genBusy, setGenBusy] = useState<{ title: boolean; summary: boolean; content: boolean }>({ title: false, summary: false, content: false })

  const plain = (html?: string) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  // --- Fallback generators (на случай, если провайдер ИИ вернул пусто) ---
  const fallbackTitle = (basis: string, category: string) => {
    const words = (basis || category || 'Новости автозапчастей').split(/\s+/).filter(Boolean)
    const slice = words.slice(0, 10)
    const text = slice.join(' ')
    const cap = text.charAt(0).toUpperCase() + text.slice(1)
    return cap.replace(/[\.\!\?]+$/,'')
  }

  const fallbackSummary = (title: string, content: string, category: string) => {
    const base = plain(content) || `${title}. ${category}`
    let s = base.trim()
    if (s.length < 140) s = `${title}. ${category}. ${s}`
    if (s.length > 220) s = s.slice(0, 217).replace(/\s+\S*$/, '') + '…'
    return s
  }

  const fallbackHtml = (title: string, summary: string, category: string) => {
    const safeTitle = (title || 'Обновление каталога автозапчастей').replace(/</g,'&lt;')
    const safeSummary = (summary || `${category} — актуальные новости и предложения.`).replace(/</g,'&lt;')
    return `
      <h2>${safeTitle}</h2>
      <p>${safeSummary}</p>
      <ul>
        <li>Актуальная информация по ассортименту и доступности</li>
        <li>Коротко и по делу — без воды</li>
        <li>Подходит для публикации в новостной ленте</li>
      </ul>
      <p>Следите за обновлениями и акциями.</p>
    `.trim()
  }
  const callAI = async (system: string, user: string) => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature, stream: false, messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ] })
    })
    if (!res.ok) throw new Error('AI error')
    return await res.text()
  }
  const genTitle = async () => {
    const basis = state.shortDescription?.trim() || plain(state.contentHtml) || state.category || ''
    const loadingId = toast.loading('Генерирую заголовок…')
    setGenBusy((b) => ({ ...b, title: true }))
    try {
      const text = await callAI(
        'Ты креативный редактор новостей об автозапчастях. Верни только заголовок на русском, 6–12 слов, без кавычек и точек, цепляющий и конкретный.',
        basis ? `Cоздай заголовок на основе: ${basis}` : 'Придумай универсальный заголовок для новостной заметки об автозапчастях (без брендинга).'
      )
      let title = (text || '').trim().replace(/\n+/g, ' ').replace(/^"|"$/g, '')
      if (!title) {
        title = fallbackTitle(basis, state.category)
      }
      setState(s => ({ ...s, title }))
      toast.success('Готово', { id: loadingId })
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сгенерировать заголовок', { id: loadingId })
    } finally {
      setGenBusy((b) => ({ ...b, title: false }))
    }
  }

  const genSummary = async () => {
    if (!state.title.trim()) {
      toast.error('Сначала введите заголовок')
      return
    }
    const loadingId = toast.loading('Генерирую короткое описание…')
    setGenBusy((b) => ({ ...b, summary: true }))
    try {
      const text = await callAI(
        'Ты редактор. Верни 1–2 предложения (140–220 символов) аннотации на русском, без кавычек и HTML. Без вводных формулировок типа «В статье рассказывается…».',
        `Заголовок: ${state.title}. Категория: ${state.category}. ${state.shortDescription ? 'Учитывай тезисы: ' + state.shortDescription : ''}`
      )
      let summary = (text || '').trim().replace(/\n+/g, ' ')
      if (!summary) {
        summary = fallbackSummary(state.title, state.contentHtml, state.category)
      }
      setState(s => ({ ...s, shortDescription: summary }))
      toast.success('Готово', { id: loadingId })
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сгенерировать описание', { id: loadingId })
    } finally {
      setGenBusy((b) => ({ ...b, summary: false }))
    }
  }

  const genContent = async () => {
    if (!state.title.trim()) {
      toast.error('Сначала введите заголовок')
      return
    }
    const loadingId = toast.loading('Генерирую статью…')
    setGenBusy((b) => ({ ...b, content: true }))
    try {
      const text = await callAI(
        'Ты профессиональный копирайтер. Верни ЧИСТЫЙ HTML без <html>/<body>. Используй <h2>, абзацы <p>, списки <ul>/<ol>. Пиши на русском, конкретно, без воды, 2–6 абзацев, можно список преимуществ. В конце никаких выводов типа «итоги».',
        `Сгенерируй статью по теме: «${state.title}». ${state.shortDescription ? 'Краткое: ' + state.shortDescription + '.' : ''} Категория: ${state.category}.`
      )
      let html = (text || '').trim()
      if (!html) {
        html = fallbackHtml(state.title, state.shortDescription, state.category)
      }
      setState(s => ({ ...s, contentHtml: html }))
      toast.success('Готово', { id: loadingId })
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сгенерировать статью', { id: loadingId })
    } finally {
      setGenBusy((b) => ({ ...b, content: false }))
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!state.title.trim()) return toast.error('Введите заголовок')
    if (!state.shortDescription.trim()) return toast.error('Короткое описание обязательно')
    if (!state.coverImageUrl.trim()) return toast.error('Загрузите обложку')
    if (!state.contentHtml || state.contentHtml === '<p></p>') return toast.error('Заполните контент')

    const input = {
      title: state.title,
      category: state.category,
      shortDescription: state.shortDescription,
      coverImageUrl: state.coverImageUrl,
      coverImageAlt: state.coverImageAlt || undefined,
      contentHtml: state.contentHtml,
      status: state.status,
      publishedAt: state.status === 'PUBLISHED' ? (state.publishedAt || new Date().toISOString()) : null,
    }

    if (state.id) {
      updateNews({ variables: { id: state.id, input } })
    } else {
      createNews({ variables: { input } })
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Заголовок *</Label>
          <Input value={state.title} onChange={e => setState(s => ({ ...s, title: e.target.value }))} placeholder="Заголовок новости" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Категория *</Label>
          <Input value={state.category} onChange={e => setState(s => ({ ...s, category: e.target.value }))} placeholder="Новости компании / Акции" />
        </div>
        <div className="space-y-2">
          <Label>Подпись к обложке</Label>
          <Input value={state.coverImageAlt || ''} onChange={e => setState(s => ({ ...s, coverImageAlt: e.target.value }))} placeholder="Описание изображения (alt)" />
        </div>
      </div>

      {/* AI generation */}
      <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><Wand2 className="w-4 h-4" /><span className="font-medium">Генерация с ИИ</span></div>
          <ModelPicker value={model} onChange={setModel} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-28">Креативность</span>
          <input type="range" min={0} max={1} step={0.1} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="flex-1" />
          <span className="text-sm tabular-nums w-10 text-right">{temperature.toFixed(1)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={genTitle} disabled={genBusy.title}>Заголовок</Button>
          <Button type="button" variant="secondary" size="sm" onClick={genSummary} disabled={genBusy.summary}>Короткое описание</Button>
          <Button type="button" variant="secondary" size="sm" onClick={genContent} disabled={genBusy.content}>Статья (HTML)</Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Короткое описание *</Label>
        <Textarea rows={3} value={state.shortDescription} onChange={e => setState(s => ({ ...s, shortDescription: e.target.value }))} />
      </div>

      <div className="space-y-2">
        <Label>Обложка *</Label>
        {state.coverImageUrl && (
          <div className="relative w-full max-w-xl overflow-hidden rounded-lg border">
            <Image
              src={state.coverImageUrl}
              alt={state.coverImageAlt || 'Обложка новости'}
              width={1024}
              height={512}
              sizes="(max-width: 768px) 100vw, 640px"
              className="h-48 w-full object-cover"
            />
          </div>
        )}
        <FileUpload onUpload={(url) => setState(s => ({ ...s, coverImageUrl: url }))} prefix="news" />
      </div>

      <div className="space-y-2">
        <Label>Контент *</Label>
        <RichTextEditor value={state.contentHtml} onChange={(html) => setState(s => ({ ...s, contentHtml: html }))} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="published"
            checked={state.status === 'PUBLISHED'}
            onCheckedChange={(checked) =>
              setState((s) => ({
                ...s,
                status: checked ? 'PUBLISHED' : 'DRAFT',
                publishedAt: checked ? (s.publishedAt || new Date().toISOString()) : null,
              }))
            }
          />
          <Label htmlFor="published">Опубликовать</Label>
        </div>
        {state.status === 'PUBLISHED' && (
          <div className="flex items-center gap-2">
            <Label>Дата публикации:</Label>
            <Input
              type="datetime-local"
              value={toLocalInputValue(state.publishedAt)}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  publishedAt: fromLocalInputValue(e.target.value),
                }))
              }
              className="w-56"
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>{state.id ? 'Сохранить' : 'Создать'}</Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>Отмена</Button>
      </div>
    </form>
  )
}
