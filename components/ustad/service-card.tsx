import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ServiceCategory } from '@/lib/data'

export function ServiceCard({
  service,
  href = '/home',
  onClick,
  className,
}: {
  service: ServiceCategory
  href?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  className?: string
}) {
  const Icon = service.icon
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'tap group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-xl',
          service.tint,
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">
          {service.label}
        </span>
        <span className="text-xs leading-relaxed text-muted-foreground">
          {service.description}
        </span>
      </div>
    </Link>
  )
}
