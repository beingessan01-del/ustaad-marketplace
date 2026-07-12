import { cn } from '@/lib/utils'
import type { AvailabilityStatus } from '@/lib/data'

export function AvailabilityBadge({
  status,
  className,
}: {
  status: AvailabilityStatus
  className?: string
}) {
  const isAvailable = status === 'available'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-xs font-medium',
        isAvailable
          ? 'bg-success-muted text-success'
          : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          isAvailable ? 'bg-success' : 'bg-muted-foreground',
        )}
      />
      {isAvailable ? 'Available' : 'Busy'}
    </span>
  )
}
