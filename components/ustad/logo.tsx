import Link from 'next/link'
import { cn } from '@/lib/utils'

export function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-1/2 text-white', className)}
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

export function Logo({
  href = '/',
  className,
  variant = 'horizontal',
  size = 'md',
  showText = true,
}: {
  href?: string
  className?: string
  variant?: 'horizontal' | 'vertical' | 'stacked'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
}) {
  const isStacked = variant === 'vertical' || variant === 'stacked'

  const tileSizes = {
    sm: 'size-8 rounded-[10px] shadow-sm shadow-[#2B66FF]/20',
    md: 'size-10 rounded-[13px] shadow-md shadow-[#2B66FF]/30',
    lg: 'size-14 rounded-[18px] shadow-lg shadow-[#2B66FF]/35',
    xl: 'size-24 rounded-[30px] shadow-xl shadow-[#2B66FF]/40',
  }

  const textSizes = {
    sm: 'text-base font-extrabold tracking-tight',
    md: 'text-lg font-extrabold tracking-tight',
    lg: 'text-2xl font-black tracking-tight',
    xl: 'text-3xl font-black tracking-tight',
  }

  const content = (
    <div
      className={cn(
        'inline-flex items-center',
        isStacked ? 'flex-col gap-3 text-center' : 'gap-2.5',
        className
      )}
    >
      {/* Top/Left Section: Squircle App Tile in Vibrant Electric Blue with Drop Shadow & White Wrench */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-[#2B66FF] transition-transform active:scale-95',
          tileSizes[size]
        )}
      >
        <WrenchIcon />
      </div>

      {/* Bottom/Right Section: Bold Clean Sans-serif Text reading 'USTAAD' in Electric Blue */}
      {showText && (
        <span
          className={cn(
            'text-[#2B66FF] font-sans uppercase leading-none select-none',
            textSizes[size]
          )}
        >
          USTAAD
        </span>
      )}
    </div>
  )

  if (!href) return content

  return (
    <Link href={href} className="inline-block hover:opacity-95 transition-opacity">
      {content}
    </Link>
  )
}
