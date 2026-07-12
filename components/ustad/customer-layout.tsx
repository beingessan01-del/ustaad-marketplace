'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Map, Clock, User, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t, isRtl } = useTranslation()

  const tabs = [
    {
      label: t('nav.home'),
      href: '/home',
      icon: Home,
    },
    {
      label: t('nav.map'),
      href: '/map',
      icon: Map,
    },
    {
      label: t('nav.history'),
      href: '/history',
      icon: Clock,
    },
    {
      label: t('nav.profile'),
      href: '/profile',
      icon: User,
    },
  ]

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col md:flex-row direction-transition">
      {/* Desktop Sidebar (Persistent left side on LTR, right side on RTL) */}
      <aside className={cn(
        "hidden md:flex flex-col w-64 border-border bg-card fixed h-full top-0 p-6 z-40 direction-transition",
        isRtl ? "right-0 border-l" : "left-0 border-r"
      )}>
        <div className="flex items-center gap-2.5 mb-8">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold tracking-tight text-lg animate-pulse">
            U
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            USTAD
          </span>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "tap flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-[#6F767E] hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("size-5", isActive ? "text-primary" : "text-[#6F767E]")} />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-border/60 text-xs text-muted-foreground">
          <p>© 2026 USTAD Technologies</p>
        </div>
      </aside>

      {/* Main Page Content Wrapper (Logical padding/margins for desktop sidebar) */}
      <div className={cn(
        "flex-1 min-h-dvh pb-20 md:pb-0 direction-transition",
        isRtl ? "md:mr-64" : "md:ml-64"
      )}>
        {children}
      </div>

      {/* Mobile Bottom Tab Bar (Persistent bottom HUD) */}
      <nav className="md:hidden fixed bottom-0 start-0 end-0 z-40 border-t border-border bg-card/95 backdrop-blur-md px-4 py-2 flex justify-around items-center soft-shadow">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 py-1 px-3 text-center tap"
            >
              <Icon
                className={cn(
                  "size-5.5 transition-colors",
                  isActive ? "text-primary scale-105" : "text-[#6F767E]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium leading-none transition-colors",
                  isActive ? "text-primary font-semibold" : "text-[#6F767E]"
                )}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
      {/* Floating Chat Bubble Button */}
      {pathname !== '/chat' && (
        <Link
          href="/chat"
          className={cn(
            "tap fixed z-30 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-xl hover:scale-105 active:scale-95 transition-all",
            isRtl 
              ? "bottom-20 md:bottom-6 start-4 md:start-6" 
              : "bottom-20 md:bottom-6 end-4 md:end-6"
          )}
          aria-label="Open Chat Assistant"
        >
          <MessageSquare className="size-5.5" />
        </Link>
      )}
    </div>
  )
}
