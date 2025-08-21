"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Settings,
  Users,
  LogOut,
  Activity,
  Package,
  UserCheck,
  ShoppingCart,
  Receipt,
  Palette,
  Star,
  Image,
  BarChart3,
  Shield,
  Bot,
  Store,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/AuthProvider'
import { useEffect, useMemo, useState } from 'react'

interface SidebarProps {
  className?: string
}

type NavItem = { title: string; href: string; icon: React.ComponentType<any> }
type NavGroup = { title: string; items: NavItem[] }

const navigationGroups: NavGroup[] = [
  {
    title: 'Обзор',
    items: [
      { title: 'Главная', href: '/dashboard', icon: Home },
      { title: 'Аудит', href: '/dashboard/audit', icon: Activity },
    ],
  },
  {
    title: 'Каталог и контент',
    items: [
      { title: 'Каталог', href: '/dashboard/catalog', icon: Package },
      { title: 'Товары главной', href: '/dashboard/homepage-products', icon: Star },
      { title: 'Баннеры героя', href: '/dashboard/hero-banners', icon: Image },
    ],
  },
  {
    title: 'Продажи и клиенты',
    items: [
      { title: 'Заказы', href: '/dashboard/orders', icon: ShoppingCart },
      { title: 'Счета', href: '/dashboard/invoices', icon: Receipt },
      { title: 'Клиенты', href: '/dashboard/clients', icon: UserCheck },
      { title: 'Менеджеры', href: '/dashboard/managers', icon: Users },
    ],
  },
  {
    title: 'Инструменты',
    items: [
      { title: 'Чат с ИИ', href: '/dashboard/ai', icon: Bot },
      { title: 'Тест стилей', href: '/dashboard/test-styles', icon: Palette },
      { title: 'Ozon', href: '/dashboard/ozon', icon: Store },
      { title: 'ZZAP статистика', href: '/dashboard/zzap', icon: BarChart3 },
    ],
  },
  {
    title: 'Система',
    items: [
      { title: 'Настройки', href: '/dashboard/settings', icon: Settings },
      { title: 'SEO', href: '/dashboard/seo', icon: Palette },
    ],
  },
]

export const Sidebar = ({ className }: SidebarProps) => {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const groupsWithActive = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const g of navigationGroups) {
      map[g.title] = g.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))
    }
    return map
  }, [pathname])

  useEffect(() => {
    setExpanded(prev => ({ ...prev, ...groupsWithActive }))
  }, [groupsWithActive])

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1">
        <div className="space-y-4 py-4">
          <div className="px-3 py-2">
            <div className="mb-8">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                ProtekAuto CMS
              </h2>
              <div className="px-4 text-sm text-muted-foreground">
                {user?.firstName} {user?.lastName}
              </div>
            </div>
            <div className="space-y-6">
              {navigationGroups.map((group) => {
                const isOpen = expanded[group.title]
                return (
                <div key={group.title}>
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2 px-2 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/80 hover:text-foreground transition-colors'
                    )}
                    onClick={() => setExpanded(prev => ({ ...prev, [group.title]: !isOpen }))}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span>{group.title}</span>
                  </button>
                  <div className={cn('space-y-1 pl-4', !isOpen && 'hidden') }>
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Button
                          key={item.href}
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start",
                            isActive && "bg-muted font-medium"
                          )}
                          asChild
                        >
                          <Link href={item.href}>
                            <Icon className="mr-2 h-4 w-4" />
                            {item.title}
                          </Link>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>
      </div>
      <div className="p-3 border-t">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </Button>
      </div>
    </div>
  )
} 
