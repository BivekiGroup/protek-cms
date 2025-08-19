"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function RoutePreloader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const key = useMemo(() => pathname, [pathname])

  useEffect(() => {
    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 400)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [key])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-800 border-t-transparent"></div>
        <div className="text-sm text-gray-700">Загрузка…</div>
      </div>
    </div>
  )
}

