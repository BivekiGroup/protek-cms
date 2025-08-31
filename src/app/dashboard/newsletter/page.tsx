"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'react-hot-toast'
import ModelPicker from '@/components/ai/ModelPicker'

type Subscriber = { id: string; email: string; createdAt: string; unsubscribedAt?: string | null }
type Campaign = { id: string; subject: string; model?: string | null; status: string; createdAt: string; sentAt?: string | null }

const defaultTemplate = (content: string) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:680px;margin:0 auto;background:#ffffff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td style="padding:24px 24px 0 24px;text-align:center;">
      <img src="/logo.svg" alt="PROTEK AUTO" style="height:32px;opacity:.9" />
    </td>
  </tr>
  <tr>
    <td style="padding:8px 24px 0 24px;">
      <hr style="border:none;border-top:1px solid #eee" />
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px 8px 24px;color:#111;">
      ${content}
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px 24px 24px;color:#6b7280;font-size:12px;">
      Вы получили это письмо, потому что подписались на рассылку PROTEKAUTO. Если вы больше не хотите получать письма, просто ответьте на это письмо словом «СТОП».
    </td>
  </tr>
</table>`

export default function NewsletterDashboard() {
  const [subs, setSubs] = useState<Subscriber[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [subject, setSubject] = useState('')
  const [model, setModel] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [subsQuery, setSubsQuery] = useState('')
  const [testEmail, setTestEmail] = useState('')

  const htmlContent = useMemo(() => editorRef.current?.innerHTML || '', [editorRef.current?.innerHTML])
  const activeSubs = useMemo(() => subs.filter(s => !s.unsubscribedAt), [subs])
  const filteredSubs = useMemo(() => {
    const q = subsQuery.trim().toLowerCase()
    if (!q) return subs
    return subs.filter(s => s.email.toLowerCase().includes(q))
  }, [subs, subsQuery])

  const refresh = async () => {
    const s = await fetch('/api/newsletter/subscribers', { cache: 'no-store' }).then(r => r.json()).catch(() => null)
    setSubs(Array.isArray(s?.items) ? s.items : [])
    const c = await fetch('/api/newsletter/campaigns', { cache: 'no-store' }).then(r => r.json()).catch(() => null)
    setCampaigns(Array.isArray(c?.items) ? c.items : [])
  }
  useEffect(() => { refresh() }, [])

  // Auto-refresh campaigns list while any is in 'sending'
  useEffect(() => {
    if (campaigns.some(c => c.status === 'sending')) {
      const id = setInterval(() => { refresh() }, 5000)
      return () => clearInterval(id)
    }
  }, [campaigns])

  const generate = async () => {
    const p = prompt.trim()
    if (!p) { toast.error('Введите задачу для ИИ'); return }
    try {
      setGenerating(true)
      const tId = toast.loading('Генерация письма…')
      const sys = {
        role: 'system',
        content: [
          'Ты — опытный копирайтер бренда PROTEK AUTO. Пиши емкие, связные и полезные письма для клиентов, покупающих автозапчасти.',
          'Требования к структуре и оформлению:',
          '- 2–3 смысловых блока: (1) ключевая новость/акция; (2) подборка или польза; (3) при необходимости — краткая врезка с советом.',
          '- Каждый блок: заголовок <h2> + 1–2 абзаца <p> + по возможности маркированный список <ul><li>…</li></ul>.',
          '- Добавь 1–2 призыва к действию с понятными ссылками <a href="#">…</a> (без UTM; вместо реальных ссылок оставь #).',
          '- Тон: профессиональный, дружелюбный, без воды и клише. Конкретика и выгоды для клиента.',
          '- Язык: русский, грамотный, без англицизмов по возможности.',
          '- Объем всего письма: 180–300 слов.',
          'Формат ответа: ЧИСТЫЙ HTML-фрагмент без <html> и <body>. Разрешены только теги: h2, p, ul, li, a. Без инлайновых стилей и скриптов.'
        ].join('\n')
      }
      const user = {
        role: 'user',
        content: [
          subject.trim() ? `Тема письма: ${subject.trim()}` : '',
          'Задача для письма:',
          p
        ].filter(Boolean).join('\n\n')
      }
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
        body: JSON.stringify({ messages: [sys, user], model: model || undefined, stream: false, temperature: 0.3 })
      })
      const text = await res.text()
      if (!res.ok) throw new Error(text || 'AI error')
      const cleaned = text.replace(/<\/?(html|body)[^>]*>/gi, '').trim()
      if (editorRef.current) {
        editorRef.current.innerHTML = defaultTemplate(cleaned)
      }
      toast.success('Сгенерировано', { id: tId })
    } catch (e) {
      toast.error('Не удалось сгенерировать письмо')
    } finally { setGenerating(false) }
  }

  const saveCampaign = async () => {
    const html = editorRef.current?.innerHTML || ''
    if (!subject.trim() || !html.trim()) { toast.error('Заполните тему и содержимое письма'); return }
    setSaving(true)
    const tId = toast.loading('Сохранение кампании…')
    try {
      const res = await fetch('/api/newsletter/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: subject.trim(), html, model: model || undefined }) })
      const j = await res.json()
      if (!res.ok || !j?.id) throw new Error('save failed')
      toast.success('Кампания сохранена', { id: tId })
      setSubject('')
      setPrompt('')
      if (editorRef.current) editorRef.current.innerHTML = ''
      refresh()
      return j.id as string
    } catch {
      toast.error('Ошибка сохранения кампании', { id: tId })
      return null
    } finally { setSaving(false) }
  }

  const send = async (id?: string) => {
    const campaignId = id || await saveCampaign()
    if (!campaignId) return
    setSending(true)
    const tId = toast.loading(testEmail?.trim() ? `Отправка теста на ${testEmail.trim()}…` : `Отправка (${activeSubs.length}) получателям…`)
    try {
      const body: any = {}
      if (testEmail.trim()) body.testEmail = testEmail.trim()
      const res = await fetch(`/api/newsletter/campaigns/${campaignId}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json()
      if (!res.ok) throw new Error(String(j?.error || 'send failed'))
      if (typeof j?.sent === 'number' && typeof j?.failed === 'number') {
        toast.success(`Отправлено: ${j.sent}, Ошибок: ${j.failed}`, { id: tId })
      } else if (j?.status === 'sending') {
        toast.success(`Рассылка запущена (${j.total || '…'})`, { id: tId })
      } else {
        toast.success('Готово', { id: tId })
      }
      setTestEmail('')
      refresh()
    } catch (e: any) {
      toast.error(`Ошибка отправки: ${String(e?.message || e)}`, { id: tId })
    } finally { setSending(false) }
  }

  const exec = (cmd: string) => { document.execCommand(cmd) }

  return (
    <div className="container mx-auto max-w-6xl py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Рассылки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Модель ИИ:</span>
              <ModelPicker value={model} onChange={setModel} />
            </div>
            <div className="flex gap-2">
              <Input placeholder="Тема письма" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-[22rem]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => exec('bold')}>Жирный</Button>
                <Button variant="secondary" size="sm" onClick={() => exec('italic')}>Курсив</Button>
                <Button variant="secondary" size="sm" onClick={() => exec('underline')}>Подчерк</Button>
                <Separator orientation="vertical" />
                <Button variant="secondary" size="sm" onClick={() => exec('insertUnorderedList')}>Список</Button>
                <Button variant="secondary" size="sm" onClick={() => exec('formatBlock') && document.execCommand('formatBlock', false, 'h2')}>Заголовок</Button>
                <Button variant="secondary" size="sm" onClick={() => exec('removeFormat')}>Очистить</Button>
              </div>
              <div ref={editorRef} contentEditable className="min-h-[260px] border rounded-md p-3 focus:outline-none prose prose-sm max-w-none" suppressContentEditableWarning />
              {generating && <div className="text-xs text-muted-foreground">Генерация…</div>}
            </div>
            <div className="space-y-2">
              <Textarea placeholder="Опишите что написать (акции, новости, категории, ссылки)" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[160px]" />
              <div className="flex gap-2">
                <Button onClick={generate} variant="default" disabled={generating}>{generating ? 'Генерация…' : 'Сгенерировать'}</Button>
                <Button onClick={() => { if (editorRef.current) editorRef.current.innerHTML = defaultTemplate('<h2>Заголовок</h2><p>Текст письма…</p>') }} variant="secondary">Шаблон</Button>
              </div>
              <Separator />
              <Input placeholder="Тестовый email (опционально)" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              <div className="text-xs text-muted-foreground">Получателей сейчас: {activeSubs.length}{testEmail ? ' (будет отправлен только тест)' : ''}</div>
              <Button disabled={sending || saving} onClick={() => send()} className="w-full">{sending ? 'Отправка…' : 'Сохранить и отправить'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Подписчики ({subs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex items-center gap-2">
              <Input placeholder="Поиск по email" value={subsQuery} onChange={(e) => setSubsQuery(e.target.value)} />
              <div className="text-xs text-muted-foreground">Активных: {activeSubs.length}</div>
            </div>
            <ScrollArea className="h-[320px] pr-2">
              <div className="space-y-1 text-sm">
                {filteredSubs.map(s => (
                  <div key={s.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <span className={`truncate ${s.unsubscribedAt ? 'line-through text-muted-foreground' : ''}`}>{s.email}</span>
                    <div className="flex items-center gap-3 flex-none">
                      <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString('ru-RU')}</span>
                      {!s.unsubscribedAt ? (
                        <Button size="sm" variant="outline" onClick={async () => {
                          try {
                            const tId = toast.loading('Отписываю…')
                            const res = await fetch(`/api/newsletter/subscribers/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unsubscribed: true }) })
                            if (!res.ok) throw new Error('unsub failed')
                            toast.success('Отписан', { id: tId })
                            refresh()
                          } catch { toast.error('Ошибка отписки') }
                        }}>Отписать</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">отписан</span>
                      )}
                    </div>
                  </div>
                ))}
                {subs.length === 0 && <div className="text-muted-foreground">Пока нет подписчиков</div>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Кампании</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {campaigns.map(c => (
                <div key={c.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.subject}</div>
                    <div className="text-xs text-muted-foreground">{c.status}{c.sentAt ? ` · ${new Date(c.sentAt).toLocaleString('ru-RU')}` : ''}</div>
                  </div>
                  <div className="flex gap-2 flex-none">
                    <Button size="sm" variant="secondary" onClick={() => send(c.id)}>Отправить снова</Button>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && <div className="text-muted-foreground">Кампаний ещё нет</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
