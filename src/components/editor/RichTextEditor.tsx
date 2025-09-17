"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Link as LinkIcon, Undo2, Redo2, Heading1, Heading2, Heading3 } from 'lucide-react'

interface Props {
  value: string
  onChange: (html: string) => void
  className?: string
}

export default function RichTextEditor({ value, onChange, className }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const editor = useEditor({
    content: value || '<p></p>',
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ allowBase64: true }),
      Link.configure({ openOnClick: true, autolink: true, linkOnPaste: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm md:prose lg:prose-lg max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })
  
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Sync external value into editor when it changes (e.g., AI generated HTML)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (typeof value === 'string' && value.trim() && value !== current) {
      // setContent without emitting update to avoid feedback loop
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  const setLink = useCallback(() => {
    const url = window.prompt('Вставьте URL ссылки')
    if (url) editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const clearLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run()
  }, [editor])

  const onChooseImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onUploadImage = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('prefix', 'news')
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      const url: string = data.data.url
      editor?.chain().focus().setImage({ src: url, alt: file.name }).run()
    } catch (e) {
      console.error('Upload image failed', e)
      alert('Не удалось загрузить изображение')
    } finally {
      setUploading(false)
    }
  }, [editor])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onUploadImage(f)
  }, [onUploadImage])

  if (!mounted || !editor) return null

  return (
    <div className={cn('border rounded-lg p-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-muted' : ''}><Bold className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-muted' : ''}><Italic className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'bg-muted' : ''}><UnderlineIcon className="w-4 h-4" /></Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}><Heading1 className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}><Heading2 className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'bg-muted' : ''}><Heading3 className="w-4 h-4" /></Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-muted' : ''}><List className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-muted' : ''}><ListOrdered className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'bg-muted' : ''}><Quote className="w-4 h-4" /></Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}><AlignLeft className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}><AlignCenter className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}><AlignRight className="w-4 h-4" /></Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm" onClick={setLink}><LinkIcon className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={clearLink}>Без ссылки</Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm" onClick={onChooseImage} disabled={uploading}><ImageIcon className="w-4 h-4" /></Button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="w-4 h-4" /></Button>
      </div>

      <div className="mt-3 rounded-lg border bg-background p-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
