'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, MapPin, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPKR, type Technician } from '@/lib/data'
import { StarRating } from './star-rating'
import { AvailabilityBadge } from './availability-badge'
import { SchedulePicker } from './schedule-picker'
import { Button } from '@/components/ui/button'

export function TechnicianCard({ technician }: { technician: Technician }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-border bg-card p-4 soft-shadow">
      <div className="flex items-start gap-3">
        <Link
          href={`/technician/${technician.id}`}
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
            technician.avatarTint,
          )}
        >
          {technician.initials}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/technician/${technician.id}`}
                className="block truncate text-sm font-semibold text-foreground hover:text-primary"
              >
                {technician.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {technician.specialty}
              </p>
            </div>
            <AvailabilityBadge status={technician.status} />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <StarRating rating={technician.rating} reviewCount={technician.reviewCount} />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {technician.distanceKm} km
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Receipt className="size-3.5" />
              {technician.inspectionFee === 0
                ? 'Free inspection'
                : `${formatPKR(technician.inspectionFee)} inspection`}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Schedule
          <ChevronDown
            data-icon="inline-end"
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </Button>
        <Button size="sm" className="flex-1" render={<Link href={`/technician/${technician.id}`} />}>
          View profile
        </Button>
      </div>

      {open && (
        <div className="mt-3 border-t border-border pt-3">
          <SchedulePicker schedule={technician.schedule} />
        </div>
      )}
    </div>
  )
}
