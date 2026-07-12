'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ScheduleDay } from '@/lib/data'

export function SchedulePicker({
  schedule,
  onSelect,
  className,
}: {
  schedule: ScheduleDay[]
  onSelect?: (day: string, time: string) => void
  className?: string
}) {
  const [activeDay, setActiveDay] = useState(0)
  const [activeSlot, setActiveSlot] = useState<string | null>(null)

  const day = schedule[activeDay]

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* date chips */}
      <div className="flex flex-wrap gap-2">
        {schedule.map((d, i) => (
          <button
            key={d.date}
            type="button"
            onClick={() => {
              setActiveDay(i)
              setActiveSlot(null)
            }}
            className={cn(
              'tap flex flex-col items-center rounded-xl border px-3 py-1.5 text-center',
              i === activeDay
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            <span className="text-xs font-semibold leading-tight">{d.label}</span>
            <span
              className={cn(
                'text-[0.7rem] leading-tight',
                i === activeDay ? 'text-primary-foreground/80' : 'text-muted-foreground',
              )}
            >
              {d.date}
            </span>
          </button>
        ))}
      </div>

      {/* time slots */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {day.slots.map((slot) => {
          const isActive = activeSlot === slot.time
          return (
            <button
              key={slot.time}
              type="button"
              disabled={slot.busy}
              onClick={() => {
                setActiveSlot(slot.time)
                onSelect?.(day.label, slot.time)
              }}
              className={cn(
                'tap rounded-xl border px-2 py-2 text-xs font-medium',
                slot.busy
                  ? 'cursor-not-allowed border-transparent bg-warning-muted text-warning'
                  : isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:bg-muted',
              )}
            >
              {slot.time}
            </button>
          )
        })}
      </div>
    </div>
  )
}
