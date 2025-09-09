"use client"

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type Conversation = { id: string; title: string | null; type: string; updatedAt: string; memberIds: string[]; members?: { user: { id: string; firstName: string; lastName: string; email: string; avatar?: string } }[]; avatar?: string | null }
type Attachment = { id: string; url: string; fileName?: string | null; contentType?: string | null }
type Message = { id: string; conversationId: string; senderId: string; content: string; createdAt: string; attachments?: Attachment[] }
type UserItem = { id: string; firstName: string; lastName: string; email: string; avatar?: string | null }

const EMOJIS = ['👍','❤️','🔥','😂','🎉','🙏','👌','😎','🫡','✨','🙌','💯','🤝','🫶','😄','😡']

export default function MessengerPage() {
  const { token, user } = useAuth()
  const headers = useMemo(() => ({ Authorization: token ? `Bearer ${token}` : '' }), [token])

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null)
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<UserItem[]>([])
  const [userNextSkip, setUserNextSkip] = useState<number | null>(0)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  useEffect(() => {
    if (!token) return
    fetch('/api/messenger/conversations', { headers })
      .then(r => r.json()).then(d => { if (d?.ok) { setConversations(d.items); if (!currentId && d.items?.[0]) setCurrentId(d.items[0].id) } })
      .catch(() => {})
  }, [token, headers, currentId])

  useEffect(() => {
    if (!currentId) { setMessages([]); return }
    fetch(`/api/messenger/conversations/${currentId}/messages`)
      .then(r => r.json()).then(d => { if (d?.ok) setMessages(d.items) })
      .catch(() => {})
  }, [currentId])

  useEffect(() => {
    if (!userQuery.trim()) { setUserResults([]); setUserNextSkip(0); return }
    const id = setTimeout(() => {
      fetch(`/api/messenger/users?q=${encodeURIComponent(userQuery)}&take=50`, { headers })
        .then(r => r.json()).then(d => { setUserResults(d?.items || []); setUserNextSkip(d?.nextSkip ?? null) })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(id)
  }, [userQuery, headers])

  const loadMoreUsers = async () => {
    if (userNextSkip == null) return
    const res = await fetch(`/api/messenger/users?q=${encodeURIComponent(userQuery)}&skip=${userNextSkip}&take=50`, { headers })
    const d = await res.json().catch(() => ({} as any))
    setUserResults(prev => [...prev, ...(d?.items || [])])
    setUserNextSkip(d?.nextSkip ?? null)
  }

  const createConversation = async () => {
    if (selectedUserIds.length === 0) return
    const body = { type: selectedUserIds.length > 1 ? 'GROUP' : 'DIRECT', memberIds: selectedUserIds }
    const res = await fetch('/api/messenger/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({} as any))
    if (data?.ok && data.id) {
      setShowCreate(false)
      setSelectedUserIds([])
      // refresh list
      try {
        const r = await fetch('/api/messenger/conversations', { headers })
        const d = await r.json().catch(() => ({} as any))
        if (d?.ok) setConversations(d.items)
      } catch {}
      setCurrentId(data.id)
    }
  }

  const refreshMessages = async () => {
    if (!currentId) return
    const r = await fetch(`/api/messenger/conversations/${currentId}/messages`)
    const d = await r.json().catch(()=>({}))
    if (d?.ok) setMessages(d.items)
  }

  const sendText = async () => {
    if (!currentId) return
    const text = input.trim()
    const hasFiles = files.length > 0
    if (!text && !hasFiles) return
    setInput('')
    if (!hasFiles) {
      await fetch(`/api/messenger/conversations/${currentId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ content: text }) })
    } else {
      const form = new FormData()
      form.set('content', text)
      files.forEach(f => form.append('file', f))
      await fetch(`/api/messenger/conversations/${currentId}/messages`, { method: 'POST', headers: { Authorization: headers.Authorization }, body: form as any })
      setFiles([])
      previews.forEach(u => URL.revokeObjectURL(u))
      setPreviews([])
    }
    await refreshMessages()
  }

  const sendEmoji = async (emoji: string) => {
    if (!currentId) return
    await fetch(`/api/messenger/conversations/${currentId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ content: emoji }) })
    await refreshMessages()
  }

  return (
    <div className="p-4 grid grid-cols-12 gap-4 h-full">
      <Card className="col-span-4 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Чаты</CardTitle>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary">Новый</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новый чат</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Поиск пользователей" value={userQuery} onChange={e=>setUserQuery(e.target.value)} />
                  <div className="max-h-72 overflow-auto space-y-1">
                    {userResults.map((u) => {
                      const checked = selectedUserIds.includes(u.id)
                      return (
                        <label key={u.id} className="flex items-center gap-3 text-sm">
                          {u.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">
                              {(u.firstName?.[0] || '').toUpperCase()}{(u.lastName?.[0] || '').toUpperCase()}
                            </div>
                          )}
                          <input type="checkbox" checked={checked} onChange={e=>{ if(e.target.checked) setSelectedUserIds(prev=>[...prev, u.id]); else setSelectedUserIds(prev=>prev.filter(id=>id!==u.id)) }} />
                          <span className="truncate">{u.firstName} {u.lastName} <span className="text-muted-foreground">({u.email})</span></span>
                        </label>
                      )
                    })}
                    {userNextSkip != null && (
                      <div className="pt-2">
                        <Button variant="outline" size="sm" onClick={loadMoreUsers} className="w-full">Показать ещё</Button>
                      </div>
                    )}
                  </div>
                  <Button onClick={createConversation} disabled={selectedUserIds.length===0}>Создать</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-[70vh] pr-2">
            <div className="space-y-1">
              {conversations.map((c: Conversation) => {
                const other = c.type === 'DIRECT' ? (c.members || []).map(m => m.user).find(u => u.id !== user?.id) : null
                return (
                  <button key={c.id} onClick={() => setCurrentId(c.id)} className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted ${currentId===c.id?'bg-muted':''}`}>
                    <div className="flex items-center gap-3">
                      {other ? (
                        other.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={other.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                            {(other.firstName?.[0]||'').toUpperCase()}{(other.lastName?.[0]||'').toUpperCase()}
                          </div>
                        )
                      ) : (
                        c.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-100" />
                        )
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{other ? `${other.firstName} ${other.lastName}` : (c.title || (c.type==='GROUP' ? 'Группа' : 'Личный чат'))}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="col-span-8 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {(() => {
              const c = conversations.find(x => x.id === currentId)
              if (!c) return 'Выберите чат'
              if (c.type === 'DIRECT') {
                const other = (c.members || []).map(m => m.user).find(u => u.id !== user?.id)
                return other ? `${other.firstName} ${other.lastName}` : 'Личный чат'
              }
              return c.title || 'Группа'
              })()}
            </CardTitle>
            {(() => {
              const c = conversations.find(x => x.id === currentId)
              if (!c || c.type !== 'GROUP') return null
              return (
                <Dialog open={showGroupSettings} onOpenChange={setShowGroupSettings}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Настройки</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Настройки группы</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const preview = groupAvatarPreview || c.avatar || null
                          return preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt="" className="h-14 w-14 rounded-full object-cover bg-gray-100" />
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-gray-100" />
                          )
                        })()}
                        <input type="file" accept="image/*" onChange={e=>{ const f = e.target.files?.[0] || null; setGroupAvatar(f); if (f) setGroupAvatarPreview(URL.createObjectURL(f)) }} />
                      </div>
                      <div>
                        <Input value={groupTitle} onChange={e=>setGroupTitle(e.target.value)} placeholder="Название группы" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={()=>setShowGroupSettings(false)}>Отмена</Button>
                        <Button onClick={async()=>{
                          if (!currentId) return
                          const hasFile = !!groupAvatar
                          if (hasFile) {
                            const form = new FormData()
                            if (groupTitle.trim()) form.set('title', groupTitle.trim())
                            form.set('avatar', groupAvatar as File)
                            await fetch(`/api/messenger/conversations/${currentId}`, { method: 'PATCH', headers: { Authorization: headers.Authorization }, body: form as any })
                          } else {
                            await fetch(`/api/messenger/conversations/${currentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ title: groupTitle.trim() || undefined }) })
                          }
                          // refresh list
                          const rr = await fetch('/api/messenger/conversations', { headers })
                          const dd = await rr.json().catch(()=>({}))
                          if (dd?.ok) setConversations(dd.items)
                          setShowGroupSettings(false)
                          if (groupAvatarPreview) { URL.revokeObjectURL(groupAvatarPreview); setGroupAvatarPreview(null) }
                        }}>Сохранить</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            })()}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`max-w-[80%] ${m.senderId===user?.id?'ml-auto text-right':''}`}>
                  <div className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString()}</div>
                  <div className={`inline-block px-3 py-2 rounded-lg ${m.senderId===user?.id?'bg-blue-600 text-white':'bg-gray-100'}`}>
                    {m.content}
                    {!!m.attachments?.length && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {m.attachments.map(a => {
                          const isImage = (a.contentType || '').startsWith('image/')
                          return (
                            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block">
                              {isImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={a.url} alt={a.fileName || ''} className="w-full h-32 object-cover rounded-md" />
                              ) : (
                                <div className="w-full p-2 text-xs rounded-md bg-white border truncate">{a.fileName || 'Файл'}</div>
                              )}
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          {!!previews.length && (
            <div className="grid grid-cols-5 gap-2 p-2 border rounded-md">
              {previews.map((src, idx) => (
                <div key={idx} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="preview" className="w-full h-20 object-cover rounded" />
                  <button onClick={()=>{ const nf=[...files]; nf.splice(idx,1); setFiles(nf); const np=[...previews]; const [u]=np.splice(idx,1); if(u) URL.revokeObjectURL(u); setPreviews(np) }} className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs hidden group-hover:flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Напишите сообщение..." onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); sendText() } }} />
            <label className="text-xs px-2 py-1 rounded bg-white border cursor-pointer">
              <input type="file" multiple onChange={e=>{ const list = Array.from(e.target.files || []); if(!list.length) return; const next=[...files, ...list]; setFiles(next); const urls=list.map(f=>URL.createObjectURL(f)); setPreviews(prev=>[...prev, ...urls]) }} className="hidden" />
              Файл
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">🙂</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="grid grid-cols-8 gap-1 p-2 w-64">
                {EMOJIS.map((emo: string) => (
                  <DropdownMenuItem key={emo as string} className="p-0">
                    <button onClick={()=>sendEmoji(emo as string)} className="w-full text-center py-1">{emo}</button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={sendText}>Отправить</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


