import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

type Pin = { top: string; left: string; active?: boolean }

const markers: Pin[] = [
  { top: '28%', left: '22%' },
  { top: '58%', left: '38%' },
  { top: '40%', left: '68%' },
  { top: '72%', left: '76%' },
]

export function MapPlaceholder({
  className,
  pins,
}: {
  className?: string
  pins?: Pin[]
}) {
  const markersToRender = pins || markers

  return (
    <div
      className={cn(
        'map-grid relative w-full overflow-hidden rounded-2xl border border-border',
        className,
      )}
      role="img"
      aria-label="Map showing nearby technicians"
    >
      <iframe
        src="https://www.openstreetmap.org/export/embed.html?bbox=73.0381,33.7154,73.0741,33.7434&layer=mapnik"
        className="absolute inset-0 w-full h-full border-0 pointer-events-none opacity-80"
      />

      {/* center user location with pulsing dot */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="relative flex size-4 items-center justify-center">
          <span
            className="absolute inline-flex size-4 rounded-full bg-primary/40"
            style={{ animation: 'ustad-ping 1.8s cubic-bezier(0,0,0.2,1) infinite' }}
          />
          <span className="relative inline-flex size-4 rounded-full border-2 border-background bg-primary soft-shadow" />
        </span>
      </div>

      {/* technician pin markers */}
      {markersToRender.map((m, i) => (
        <span
          key={i}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ top: m.top, left: m.left }}
        >
          <span className={cn(
            "flex size-7 items-center justify-center rounded-full border border-border bg-card soft-shadow",
            m.active && "border-primary bg-primary/10"
          )}>
            <MapPin className={cn("size-3.5 text-primary", m.active && "text-primary animate-bounce")} />
          </span>
        </span>
      ))}
    </div>
  )
}
