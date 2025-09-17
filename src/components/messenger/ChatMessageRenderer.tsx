"use client"

import React, { useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'
import Image from 'next/image'
import type { Components } from 'react-markdown'

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
type MarkdownCodeProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
  inline?: boolean
  node?: unknown
}

const CodeInline: React.FC<MarkdownCodeProps> = ({ children, className, ...rest }) => (
  <code className={clsx('px-1 py-0.5 rounded bg-muted text-foreground/90', className)} {...rest}>
    {children}
  </code>
)

// Блочный код: кастомизируем именно <pre>, чтобы не ломать семантику (избежать <pre> внутри <p>)
const PreBlock: React.FC<React.HTMLAttributes<HTMLPreElement> & { node?: unknown }> = ({ children, className, node: _node, ...rest }) => {
  void _node
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
    <pre
      ref={preRef}
      className={clsx('relative p-3 rounded bg-zinc-900 text-zinc-100 overflow-auto text-sm', className)}
      {...rest}
    >
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

const LinkRenderer: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({ className, ...props }) => (
  <a
    {...props}
    target="_blank"
    rel="noopener noreferrer"
    className={clsx('text-blue-600 hover:underline', className)}
  />
)

const ImgRenderer = ({ node, src, alt = '', className, width, height, ...rest }: { node?: unknown } & React.ImgHTMLAttributes<HTMLImageElement>) => {
  void node
  if (!src) return null
  const numericWidth = typeof width === 'number' ? width : 800
  const numericHeight = typeof height === 'number' ? height : 450
  return (
    <span className="block">
      <Image
        src={src as string}
        alt={alt}
        width={numericWidth}
        height={numericHeight}
        sizes="(max-width: 768px) 100vw, 800px"
        className={clsx('h-auto w-full max-w-full rounded border', className)}
        {...rest}
      />
    </span>
  )
}

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

  const components = useMemo<Components>(() => ({
    code: ({ inline, children, className, node: codeNode, ...props }: MarkdownCodeProps) => {
      void codeNode
      const rest = props
      if (inline) {
        return (
          <CodeInline
            inline
            className={className}
            {...rest}
          >
            {children}
          </CodeInline>
        )
      }
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      )
    },
    pre: (props) => <PreBlock {...props} />,
    a: (props) => <LinkRenderer {...props} />,
    img: (props) => <ImgRenderer {...props} />,
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
                <Image
                  src={img.url}
                  alt={img.fileName || 'Вложенное изображение'}
                  width={320}
                  height={160}
                  sizes="(max-width: 640px) 50vw, 320px"
                  className="h-28 w-full rounded border object-cover"
                />
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
