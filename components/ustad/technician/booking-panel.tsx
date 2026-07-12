'use client'

import Link from 'next/link'
import { formatPKR, type Technician } from '@/lib/data'
import { SchedulePicker } from '../schedule-picker'
import { AvailabilityBadge } from '../availability-badge'
import { Button } from '@/components/ui/button'

export function BookingPanelContent({ technician }: { technician: Technician }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Inspection fee</span>
          <span className="text-lg font-bold text-foreground">
            {technician.inspectionFee === 0
              ? 'Free'
              : formatPKR(technician.inspectionFee)}
          </span>
        </div>
        <AvailabilityBadge status={technician.status} />
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-2.5 text-sm font-medium text-foreground">
          Pick a time
        </p>
        <SchedulePicker schedule={technician.schedule} />
      </div>

      <Button
        size="lg"
        className="tap h-12 w-full"
        render={<Link href={`/booking/${technician.id}`} />}
      >
        Request Quote
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        You&apos;ll review and approve a fixed quote before any work begins.
      </p>
    </div>
  )
}
