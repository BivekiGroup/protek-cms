'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Send, User, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider'
import ModelPicker from '@/components/ai/ModelPicker'
import { FileUpload } from '@/components/ui/file-upload'

export default function AIChat() {
  const { token } = useAuth()
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<{ id: string; title: string; model: string; createdAt: string; updatedAt: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; attachments?: { url: string; name?: string; contentType?: string }[] }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [attachments, setAttachments] = useState<{ url: string; name?: string; contentType?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [genOpen, setGenOpen] = useState(false)
  const [genType, setGenType] = useState<'image' | 'video'>('image')
  const [genModel, setGenModel] = useState<string>('nano-banana')
  const [genPrompt, setGenPrompt] = useState<string>('')
  const [genBusy, setGenBusy] = useState(false)
  const [genStatus, setGenStatus] = useState<string>('')
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Load sessions list and open the last one
  const refreshSessions = async () => {
    const res = await fetch('/api/ai/sessions', { cache: 'no-store', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
    const data = await res.json().catch(() => null)
    const items = Array.isArray(data?.items) ? data.items : []
    setSessions(items)
    if (!sessionId && items.length) {
      selectSession(items[0].id)
    }
  }

  const selectSession = async (id: string) => {
    setSessionId(id)
    const res = await fetch(`/api/ai/sessions/${id}/messages`, { cache: 'no-store', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
    const data = await res.json().catch(() => null)
    const items = Array.isArray(data?.items) ? data.items : []
    setMessages(items.map((m: any) => ({ role: m.role, content: m.content })))
  }

  useEffect(() => { refreshSessions() }, [])

  // Load available models and current config
  useEffect(() => {
    (async () => {
      try {
        const dbg = await fetch('/api/ai/chat/debug', { cache: 'no-store' }).then(r => r.json()).catch(() => null)
        if (dbg?.model && typeof dbg.model === 'string') setSelectedModel(dbg.model)
      } catch {}
      try {
        const res = await fetch('/api/ai/models', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        const ids: string[] = Array.isArray(data?.data)
          ? data.data.map((m: any) => m?.id).filter((s: any) => typeof s === 'string')
          : (Array.isArray(data?.data?.data) ? data.data.data.map((m: any) => m?.id).filter((s: any) => typeof s === 'string') : [])
        if (ids.length) setModels(ids)
      } catch {}
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;

    // attachments are per-message
    const atts = attachments
    const userMsg = { role: 'user' as const, content, attachments: atts };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setAttachments([])

    // Create placeholder assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      // Ensure session exists
      let currentId = sessionId
      if (!currentId) {
        const create = await fetch('/api/ai/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ title: 'Новый диалог', model: selectedModel || undefined }) })
        const data = await create.json().catch(() => null)
        currentId = data?.id
        setSessionId(currentId)
        refreshSessions()
      }
      const res = await fetch(`/api/ai/sessions/${currentId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content, model: selectedModel || undefined, attachments: atts }),
      });

      if (!res.body) {
        const text = await res.text();
        setMessages(prev => {
          const updated = [...prev];
          // update last assistant message
          const idx = updated.findIndex((m, i) => i === updated.length - 1 && m.role === 'assistant');
          if (idx >= 0) updated[idx] = { role: 'assistant', content: text };
          return updated;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          const idx = updated.findIndex((m, i) => i === updated.length - 1 && m.role === 'assistant');
          if (idx >= 0) updated[idx] = { role: 'assistant', content: assistantText };
          return updated;
        });
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        const idx = updated.findIndex((m, i) => i === updated.length - 1 && m.role === 'assistant');
        const errorText = 'Ошибка запроса к ИИ провайдеру';
        if (idx >= 0) updated[idx] = { role: 'assistant', content: errorText };
        return updated;
      });
    } finally {
      setIsLoading(false);
      // refresh sessions to update last-used model and ordering
      refreshSessions()
    }
  }

  return (
    <div className="container mx-auto max-w-6xl py-6">
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Sidebar */}
        <div className="w-72 flex-none">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">История чатов</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <div className="p-3">
                <Button className="w-full" variant="secondary" onClick={async () => {
                  const create = await fetch('/api/ai/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ title: 'Новый диалог', model: selectedModel || undefined }) })
                  const data = await create.json().catch(() => null)
                  if (data?.id) { await refreshSessions(); await selectSession(data.id) }
                }}>Новый диалог</Button>
              </div>
              <Separator />
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {sessions.map(s => {
                    const isActive = s.id === sessionId
                    const isEditing = editingId === s.id
                    return (
                      <div key={s.id} className={`group w-full px-3 py-2 rounded-md text-sm hover:bg-muted ${isActive ? 'bg-muted' : ''}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          {isEditing ? (
                            <input
                              autoFocus
                              className="w-full bg-background border rounded px-2 py-1 text-sm"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={async () => {
                                const title = editingTitle.trim() || 'Диалог'
                                setEditingId(null)
                                setEditingTitle('')
                                await fetch(`/api/ai/sessions/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ title }) })
                                refreshSessions()
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                if (e.key === 'Escape') { setEditingId(null); setEditingTitle('') }
                              }}
                            />
                          ) : (
                            <button className="flex-1 min-w-0 text-left truncate font-medium" onClick={() => selectSession(s.id)} title={s.title || 'Диалог'}>
                              {s.title || 'Диалог'}
                            </button>
                          )}
                          {!isEditing && (
                            <div className="flex flex-none items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button title="Переименовать" onClick={() => { setEditingId(s.id); setEditingTitle(s.title || '') }} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-background/50">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button title="Удалить" onClick={async () => {
                                if (!confirm('Удалить диалог?')) return
                                await fetch(`/api/ai/sessions/${s.id}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
                                if (sessionId === s.id) { setSessionId(''); setMessages([]) }
                                refreshSessions()
                              }} className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-background/50">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Убрали вывод модели у чата по требованию */}
                      </div>
                    )
                  })}
                  {sessions.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">Нет диалогов</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat pane */}
        <div className="flex-1 min-w-0">
          <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Чат с ИИ
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground min-w-0">Задайте любой вопрос искусственному интеллекту</p>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Модель:</span>
              <ModelPicker value={selectedModel} onChange={(id) => setSelectedModel(id)} />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Добро пожаловать!</h3>
                <p className="text-muted-foreground">
                  Начните разговор с ИИ, задав свой первый вопрос
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">
                      {message.content}
                    </div>
                    {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                      <div className={`mt-2 ${message.role === 'user' ? 'text-primary-foreground/90' : 'text-foreground/90'}`}>
                        <div className="flex flex-wrap gap-2">
                          {message.attachments.map((a, i) => {
                            const isImg = (a.contentType || '').startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(a.url)
                            if (!isImg) return null
                            return (
                              <div key={i} className="border border-white/10 rounded p-0.5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={a.url} alt={a.name || 'attachment'} className="h-8 w-8 object-cover rounded" />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-100" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter>
          <div className="w-full space-y-2">
            {/* Generation panel */}
            <div className="border rounded p-2 bg-muted/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={genType === 'image' ? 'default' : 'outline'} onClick={() => { setGenType('image'); setGenModel('nano-banana') }}>Фото</Button>
                  <Button size="sm" variant={genType === 'video' ? 'default' : 'outline'} onClick={() => { setGenType('video'); setGenModel('veo3-fast') }}>Видео</Button>
                </div>
                <button className="text-xs underline" onClick={() => setGenOpen(v => !v)}>{genOpen ? 'Скрыть генерацию' : 'Генерация'}</button>
              </div>
              {genOpen && (
                <div className="mt-2 grid sm:grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-xs text-muted-foreground">Модель</label>
                    <select className="w-full border rounded px-2 py-1 text-sm bg-background" value={genModel} onChange={(e) => setGenModel(e.target.value)}>
                      {genType === 'image' ? (
                        <>
                          <option value="nano-banana">nano-banana</option>
                        </>
                      ) : (
                        <>
                          <option value="veo3-fast">veo3-fast</option>
                          <option value="veo3">veо3</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Промпт</label>
                    <Input value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} placeholder={genType === 'image' ? 'Например: лого в стиле неон' : 'Например: короткое видео про продукт'} />
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Button size="sm" disabled={genBusy || !genPrompt.trim()} onClick={async () => {
                      // ensure session exists
                      let currentId = sessionId
                      if (!currentId) {
                        const create = await fetch('/api/ai/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ title: 'Новый диалог', model: selectedModel || undefined }) })
                        const dj = await create.json().catch(() => null)
                        currentId = dj?.id
                        if (currentId) setSessionId(currentId)
                      }
                      setGenBusy(true); setGenStatus('')
                      try {
                        if (genType === 'image') {
                          const filesUrl = attachments.filter(a => (a.contentType || '').startsWith('image/')).map(a => a.url)
                          const res = await fetch('/api/ai/images/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: genModel, prompt: genPrompt.trim(), filesUrl }) })
                          const j = await res.json().catch(() => null)
                          if (!res.ok || !j?.requestId) throw new Error(j?.error || 'Ошибка старта генерации')
                          const id = j.requestId
                          setGenStatus('Запущено…')
                          let tries = 0
                          const poll = async () => {
                            tries++
                            const s = await fetch(`/api/ai/images/${id}`).then(r => r.json()).catch(() => null)
                            const status = (s?.status || '').toUpperCase()
                            if (status === 'COMPLETED' && s?.url) {
                              setMessages(prev => [...prev, { role: 'assistant', content: `Готово: ${s.url}`, attachments: [{ url: s.url, name: 'image.png', contentType: 'image/png' }] }])
                              if (currentId) {
                                await fetch(`/api/ai/sessions/${currentId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ role: 'assistant', content: `Готово: ${s.url}` }) })
                              }
                              setGenBusy(false); setGenStatus('')
                              return
                            }
                            if (status === 'FAILED') { setGenBusy(false); setGenStatus('Ошибка генерации'); return }
                            if (tries > 60) { setGenBusy(false); setGenStatus('Таймаут ожидания'); return }
                            setGenStatus(`Статус: ${status || '…'}`)
                            setTimeout(poll, 3000)
                          }
                          setTimeout(poll, 2500)
                        } else {
                          const imageUrls = attachments.filter(a => (a.contentType || '').startsWith('image/')).map(a => a.url)
                          const res = await fetch('/api/ai/videos/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: genModel, prompt: genPrompt.trim(), imageUrls }) })
                          const j = await res.json().catch(() => null)
                          if (!res.ok || !j?.requestId) throw new Error(j?.error || 'Ошибка старта генерации')
                          const id = j.requestId
                          setGenStatus('Запущено…')
                          let tries = 0
                          const poll = async () => {
                            tries++
                            const s = await fetch(`/api/ai/videos/${id}`).then(r => r.json()).catch(() => null)
                            const status = (s?.status || '').toUpperCase()
                            if (status === 'COMPLETED' && s?.url) {
                              setMessages(prev => [...prev, { role: 'assistant', content: `Видео готово: ${s.url}` }])
                              if (currentId) {
                                await fetch(`/api/ai/sessions/${currentId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ role: 'assistant', content: `Видео готово: ${s.url}` }) })
                              }
                              setGenBusy(false); setGenStatus('')
                              return
                            }
                            if (status === 'FAILED') { setGenBusy(false); setGenStatus('Ошибка генерации'); return }
                            if (tries > 80) { setGenBusy(false); setGenStatus('Таймаут ожидания'); return }
                            setGenStatus(`Статус: ${status || '…'}`)
                            setTimeout(poll, 4000)
                          }
                          setTimeout(poll, 3000)
                        }
                      } catch (e: any) {
                        setGenBusy(false); setGenStatus(e?.message || 'Ошибка')
                      }
                    }}>Сгенерировать</Button>
                    {genStatus && <div className="text-xs text-muted-foreground">{genStatus}</div>}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {attachments.map((a, idx) => {
                  const isImg = (a.contentType || '').startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(a.url)
                  return (
                    <div key={idx} className="relative border rounded p-0.5">
                      {isImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.url} alt={a.name || 'attachment'} className="h-10 w-10 object-cover rounded" />
                      ) : (
                        null
                      )}
                      <button type="button" className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] leading-3" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>×</button>
                    </div>
                  )
                })}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      if (!file.type.startsWith('image/')) return
                      if (file.size > 10 * 1024 * 1024) return
                      const form = new FormData()
                      form.append('file', file)
                      form.append('prefix', 'ai')
                      const res = await fetch('/api/upload', { method: 'POST', body: form })
                      const j = await res.json().catch(() => null)
                      if (res.ok && j?.data?.url) {
                        const url: string = j.data.url
                        const name = url.split('/').pop() || file.name
                        setAttachments(prev => [...prev, { url, name, contentType: file.type }])
                      }
                    } finally {
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-1" /> Фото
                </Button>
              </div>
              {/* убрали большой дропзон — компактная кнопка добавления фото */}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2 w-full">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Введите ваш вопрос..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardFooter>
        </Card>
        </div>
      </div>
    </div>
  );
}
