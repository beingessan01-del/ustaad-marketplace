import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({
  rating,
  reviewCount,
  size = 'sm',
  showValue,
  className,
}: {
  rating: number
  reviewCount?: number
  size?: 'sm' | 'md'
  showValue?: boolean
  className?: string
}) {
  const star = size === 'md' ? 'size-4' : 'size-3.5'
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Star className={cn(star, 'fill-[#F5A623] text-[#F5A623]')} />
      <span
        className={cn(
          'font-semibold text-foreground',
          size === 'md' ? 'text-sm' : 'text-[0.8rem]',
        )}
      >
        {rating.toFixed(1)}
      </span>
      {typeof reviewCount === 'number' && (
        <span
          className={cn(
            'text-muted-foreground',
            size === 'md' ? 'text-sm' : 'text-[0.8rem]',
          )}
        >
          ({reviewCount})
        </span>
      )}
    </div>
  )
}
