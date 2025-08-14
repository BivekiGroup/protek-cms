"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { gql, useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const CREATE_SEO = gql`
  mutation CreateSeo($input: SeoPageConfigInput!) {
    createSeoPageConfig(input: $input) { id }
  }
`

export default function SeoCreatePage() {
  const router = useRouter()
  const [input, setInput] = useState<any>({ matchType: 'EXACT', noIndex: false, noFollow: false })
  const [createSeo, { loading }] = useMutation(CREATE_SEO, {
    onCompleted: (res) => router.push(`/dashboard/seo/${res.createSeoPageConfig.id}`)
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createSeo({ variables: { input } })
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Новая SEO-конфигурация</h1>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label>Путь/шаблон</Label>
          <Input placeholder="/about или /catalog или ^/vehicle-search/.*$" value={input.pattern || ''} onChange={(e) => setInput({ ...input, pattern: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Тип совпадения</Label>
          <Select value={input.matchType} onValueChange={(v) => setInput({ ...input, matchType: v })}>
            <SelectTrigger><SelectValue placeholder="Тип" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EXACT">EXACT</SelectItem>
              <SelectItem value="PREFIX">PREFIX</SelectItem>
              <SelectItem value="REGEX">REGEX</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Title</Label><Input value={input.title || ''} onChange={(e) => setInput({ ...input, title: e.target.value })} /></div>
          <div className="space-y-2"><Label>Keywords</Label><Input value={input.keywords || ''} onChange={(e) => setInput({ ...input, keywords: e.target.value })} /></div>
        </div>
        <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={input.description || ''} onChange={(e) => setInput({ ...input, description: e.target.value })} /></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>OG Title</Label><Input value={input.ogTitle || ''} onChange={(e) => setInput({ ...input, ogTitle: e.target.value })} /></div>
          <div className="space-y-2"><Label>OG Description</Label><Input value={input.ogDescription || ''} onChange={(e) => setInput({ ...input, ogDescription: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>OG Image</Label><Input value={input.ogImage || ''} onChange={(e) => setInput({ ...input, ogImage: e.target.value })} /></div>
          <div className="space-y-2"><Label>Canonical URL</Label><Input value={input.canonicalUrl || ''} onChange={(e) => setInput({ ...input, canonicalUrl: e.target.value })} /></div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2"><Switch checked={!!input.noIndex} onCheckedChange={(v) => setInput({ ...input, noIndex: v })} /> <span>noindex</span></label>
          <label className="flex items-center gap-2"><Switch checked={!!input.noFollow} onCheckedChange={(v) => setInput({ ...input, noFollow: v })} /> <span>nofollow</span></label>
        </div>

        <div className="space-y-2">
          <Label>Structured Data (JSON-LD)</Label>
          <Textarea rows={6} placeholder="{\n  \"@context\": \"https://schema.org\"\n}" value={typeof input.structuredData === 'string' ? input.structuredData : (input.structuredData ? JSON.stringify(input.structuredData, null, 2) : '')} onChange={(e) => {
            try {
              const val = e.target.value?.trim()
              setInput({ ...input, structuredData: val ? JSON.parse(val) : null })
            } catch {
              setInput({ ...input, structuredData: e.target.value })
            }
          }} />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>Сохранить</Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/dashboard/seo')}>Отмена</Button>
        </div>
      </form>
    </div>
  )
}

