'use client'

import Link from 'next/link'
import { Bell, ChevronDown, MapPin } from 'lucide-react'
import { Logo } from './logo'

export function AppTopbar({ area = 'F-7, Islamabad' }: { area?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
        <button
          type="button"
          className="tap flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5"
        >
          <MapPin className="size-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{area}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-1">
          <Link
            href="/jobs/JOB-2481"
            className="tap flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Notifications"
          >
            <span className="relative">
              <Bell className="size-5" />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-background bg-primary" />
            </span>
          </Link>
          <Logo href="/home" className="ml-1 hidden text-base sm:inline-flex" />
        </div>
      </div>
    </header>
  )
}
