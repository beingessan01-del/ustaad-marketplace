import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Logo({
  href = '/',
  className,
}: {
  href?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 text-lg font-bold tracking-tight text-foreground',
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-primary-foreground">
        U
      </span>
      <span>USTAD</span>
    </Link>
  )
}
