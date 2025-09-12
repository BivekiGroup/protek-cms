"use client"

import React, { useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'

type Attachment = {
  url: string
  fileName?: string
  contentType?: string
  size?: number
}

type Msg = {
  role: 'user' | 'assistant' | 'system' | 'error'
  content?: string
  attachments?: Attachment[]
}

function isImage(att?: Attachment) {
  return (att?.contentType || '').startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(att?.url || '')
}

// Inline code (внутри абзаца)
const CodeInline: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <code className="px-1 py-0.5 rounded bg-muted text-foreground/90">{children}</code>
)

// Блочный код: кастомизируем именно <pre>, чтобы не ломать семантику (избежать <pre> внутри <p>)
const PreBlock: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)
  const onCopy = async () => {
    try {
      const text = preRef.current?.innerText || ''
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }
  return (
    <pre ref={preRef} className={clsx('relative p-3 rounded bg-zinc-900 text-zinc-100 overflow-auto text-sm')}>
      <button
        type="button"
        onClick={onCopy}
        className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-zinc-800/80 text-zinc-50"
      >
        {copied ? 'Скопировано' : 'Копировать'}
      </button>
      {children}
    </pre>
  )
}

const LinkRenderer: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = (props) => (
  <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" />
)

const ImgRenderer: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
  <img {...props} className={clsx('max-w-full rounded border', props.className)} />
)

export default function ChatMessageRenderer({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user'
  const isSystem = msg.role === 'system'
  const isError = msg.role === 'error'

  const bubbleCls = clsx(
    'max-w-[85%] rounded-lg p-3 whitespace-pre-wrap break-words',
    isUser && 'bg-primary text-primary-foreground',
    isSystem && 'bg-muted text-foreground border',
    isError && 'bg-red-50 text-red-700 border border-red-200',
    !isUser && !isSystem && !isError && 'bg-white text-foreground border'
  )

  const containerCls = clsx('flex w-full', isUser ? 'justify-end' : 'justify-start')

  const components = useMemo(() => ({
    // Встраиваемый код
    code: ({ inline, children }: any) => inline ? <CodeInline>{children}</CodeInline> : <code>{children}</code>,
    // Блочный код
    pre: PreBlock as any,
    a: LinkRenderer as any,
    img: ImgRenderer as any,
  }), [])

  const images = (msg.attachments || []).filter(isImage)
  const files = (msg.attachments || []).filter((a) => !isImage(a))

  return (
    <div className={containerCls}>
      <div className="flex flex-col gap-2">
        {msg.content ? (
          <div className={bubbleCls}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
              {msg.content}
            </ReactMarkdown>
          </div>
        ) : null}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {images.map((img, i) => (
              <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={img.url} alt={img.fileName || 'image'} className="w-full h-28 object-cover rounded border" />
              </a>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="rounded border bg-zinc-50 p-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Вложения</div>
            <ul className="space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {f.fileName || f.url}
                  </a>
                  <span className="text-zinc-400">•</span>
                  <span className="text-zinc-500">{f.contentType || 'file'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
