'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Search, AlertCircle, Sparkles, Navigation, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomerLayout } from '@/components/ustad/customer-layout'
import { AppTopbar } from '@/components/ustad/app-topbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/lib/i18n'
import {
  serviceCategories,
  technicians,
  formatPKR,
  type Technician,
} from '@/lib/data'
import {
  getDbTable,
  getDbTableAsync,
  saveDbTable,
  type TechnicianStatus,
} from '@/lib/storage-sync'
import { StarRating } from '@/components/ustad/star-rating'
import { AvailabilityBadge } from '@/components/ustad/availability-badge'

function MapPageContent() {
  const router = useRouter()
  const { t, isRtl } = useTranslation()

  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [panning, setPanning] = useState(false)
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null)
  const [onlineTechs, setOnlineTechs] = useState<Technician[]>([])

  // Coordinate projection mapping for the 6 technicians around Islamabad F-7 center
  const techCoordinates: Record<string, { top: string; left: string }> = {
    'usman-khan': { top: '32%', left: '38%' },      // Plumbing
    'adnan-raza': { top: '55%', left: '60%' },      // Electrical
    'faisal-mehmood': { top: '22%', left: '72%' },  // Mechanic
    'zeeshan-ali': { top: '65%', left: '25%' },     // Painting
    'kamran-shah': { top: '15%', left: '46%' },     // Cleaning
    'naveed-akhtar': { top: '78%', left: '52%' },   // Carpentry
  }

  // category tints for map pins
  const categoryColorClasses: Record<string, string> = {
    plumbing: 'bg-[#2F6FED] text-white',
    electrical: 'bg-[#E0A100] text-white',
    mechanic: 'bg-[#5B5BD6] text-white',
    painting: 'bg-[#9C27B0] text-white',
    cleaning: 'bg-[#10B981] text-white',
    carpentry: 'bg-[#F5A623] text-white',
  }

  // Populate technician statuses, fetching from Supabase first
  useEffect(() => {
    const loadOnlineTechs = async () => {
      let activeTechnicians = [...technicians]
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'provider')
        if (data && data.length > 0) {
          activeTechnicians = data.map((profile: any, idx: number) => {
            const mock = technicians[idx % technicians.length]
            const nameToUse = profile.full_name || mock.name
            return {
              ...mock,
              id: profile.id,
              name: nameToUse,
              initials: nameToUse.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
              specialty: mock.specialty,
              category: mock.category,
            }
          })
        }
      } catch (e) {
        console.warn('Failed to load technician profiles on map:', e)
      }

      const statuses = await getDbTableAsync<TechnicianStatus>('technician_status')

      if (statuses.length === 0) {
        const initialStatuses = activeTechnicians.map((t) => ({
          technician_id: t.id,
          is_online: t.status === 'available',
          current_lat: 33.7294,
          current_lng: 73.0561,
          last_ping_at: Date.now(),
          active_job_id: null,
        }))
        saveDbTable('technician_status', initialStatuses)
        const onlineIds = initialStatuses.filter(s => s.is_online).map(s => s.technician_id)
        const matched = activeTechnicians.filter((t) => onlineIds.includes(t.id) || t.status === 'available')
        setOnlineTechs(matched)
      } else {
        const onlineIds = statuses.filter((s) => s.is_online).map((s) => s.technician_id)
        const matched = activeTechnicians.filter((t) => onlineIds.includes(t.id) || t.status === 'available')
        setOnlineTechs(matched)
      }
      setLoading(false)
    }

    const timer = setTimeout(loadOnlineTechs, 600)
    return () => clearTimeout(timer)
  }, [])

  // Filter technicians based on chip
  const filteredTechs = onlineTechs.filter((t) => {
    if (selectedCategory === 'all') return true
    return t.category === selectedCategory
  })

  // Simulated Pan map trigger
  const handleSimulatePan = () => {
    setPanning(true)
    setSelectedTech(null)
    setTimeout(() => {
      setPanning(false)
    }, 500)
  }

  const handleRequestTechNow = (tech: Technician) => {
    // Check if still online
    const currentStatuses = getDbTable<TechnicianStatus>('technician_status')
    const statusRow = currentStatuses.find((s) => s.technician_id === tech.id)

    // Route to targeted dispatch flow
    router.push(`/booking/instant?category=${tech.category}&techId=${tech.id}`)
  }

  return (
    <CustomerLayout>
      <div className="min-h-dvh flex flex-col bg-background">
        <AppTopbar />

        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Header Horizontal Filter Chips */}
          <div className="border-b border-border bg-card/85 backdrop-blur-xs py-3 px-4 z-10 sticky top-0 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-bold tracking-tight text-foreground">
                {t('map.browsable_map_title')}
              </h1>
              <button
                onClick={handleSimulatePan}
                className="text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-0.5 rounded font-bold uppercase transition-colors"
              >
                Simulate Pan Map
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
              <button
                onClick={() => {
                  setSelectedCategory('all')
                  setSelectedTech(null)
                }}
                className={cn(
                  "tap rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap border transition-all",
                  selectedCategory === 'all'
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-[#6F767E] hover:bg-muted hover:text-foreground"
                )}
              >
                {t('map.filter_all')}
              </button>
              {serviceCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCategory(c.id)
                    setSelectedTech(null)
                  }}
                  className={cn(
                    "tap rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap border transition-all",
                    selectedCategory === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-[#6F767E] hover:bg-muted hover:text-foreground"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Standalone Map viewport */}
          <div className="flex-1 min-h-[400px] relative bg-[#F5F6F8]">
            {loading || panning ? (
              // Shared Loading skeletons tinted to #F5F6F8 matching card shape
              <div className="absolute inset-0 z-20 bg-background/70 backdrop-blur-xs p-4 flex flex-col gap-4 justify-center items-center">
                <div className="w-full max-w-sm flex flex-col gap-3">
                  <Skeleton className="h-10 w-2/3 mx-auto" />
                  <Skeleton className="h-40 w-full rounded-2xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </div>
            ) : null}

            {/* Simulated Live Map Grid */}
            <div className="map-grid relative w-full h-full min-h-[480px] overflow-hidden rounded-2xl">
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=73.0381,33.7154,73.0741,33.7434&layer=mapnik"
                className="absolute inset-0 w-full h-full border-0 pointer-events-none opacity-80"
              />
              {/* Pulsing Customer Pin (Map center F-7) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <span className="relative flex size-4.5 items-center justify-center">
                  <span className="absolute inline-flex size-5 rounded-full bg-primary/40 animate-ping" />
                  <span className="relative inline-flex size-4.5 rounded-full border-2 border-background bg-primary soft-shadow" />
                </span>
              </div>

              {/* Technician pins on Map */}
              {filteredTechs.map((tech) => {
                const coords = techCoordinates[tech.id] || { top: '40%', left: '40%' }
                const isSelected = selectedTech?.id === tech.id
                const markerBg = categoryColorClasses[tech.category] || 'bg-primary'

                return (
                  <button
                    key={tech.id}
                    onClick={() => setSelectedTech(tech)}
                    className="absolute -translate-x-1/2 -translate-y-full tap z-20 group transition-transform active:scale-95"
                    style={{ top: coords.top, left: coords.left }}
                  >
                    <span className={cn(
                      "flex size-9 items-center justify-center rounded-full border border-border shadow-lg transition-all",
                      isSelected ? "scale-110 ring-4 ring-primary/20 border-primary" : "",
                      markerBg
                    )}>
                      <MapPin className="size-4.5" />
                    </span>
                    <span className="absolute top-full start-1/2 -translate-x-1/2 bg-foreground text-background text-[8px] font-bold px-1 py-0.5 rounded whitespace-nowrap shadow-sm mt-1">
                      {tech.initials}
                    </span>
                  </button>
                )
              })}

              {/* Empty state alert overlay */}
              {!loading && !panning && filteredTechs.length === 0 && (
                <div className="absolute inset-x-4 top-1/3 z-20 flex justify-center">
                  <div className="bg-card border border-border rounded-2xl p-5 max-w-xs soft-shadow flex flex-col gap-3 items-center text-center">
                    <AlertCircle className="size-8 text-muted-foreground/60" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{t('map.no_technicians_online')}</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-normal">
                        Try clearing category filters or check another neighborhood in Islamabad.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tapped Technician Detail Overlay (Slides up from bottom / side panel) */}
              {selectedTech && (
                <div className="absolute bottom-4 inset-x-4 z-30 max-w-sm mx-auto animate-in slide-in-from-bottom duration-200">
                  <Card className="soft-shadow border-primary/20 bg-card rounded-2xl overflow-hidden">
                    <CardContent className="p-4 flex flex-col gap-3 relative">
                      <button
                        onClick={() => setSelectedTech(null)}
                        className="absolute top-2.5 end-2.5 p-1 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted tap"
                        aria-label="Close"
                      >
                        <X className="size-4" />
                      </button>

                      {/* Header quick details */}
                      <div className="flex items-start gap-3 pt-1">
                        <div className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm",
                          selectedTech.avatarTint
                        )}>
                          {selectedTech.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-foreground truncate">{selectedTech.name}</h4>
                          <p className="text-xs text-muted-foreground truncate">{selectedTech.specialty}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                            <StarRating rating={selectedTech.rating} reviewCount={selectedTech.reviewCount} size="sm" />
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              {t('map.distance', { distance: selectedTech.distanceKm.toFixed(1) })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action trigger footer */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground">Inspection Fee</span>
                          <span className="text-xs font-bold text-foreground">
                            {selectedTech.inspectionFee === 0 ? 'Free' : formatPKR(selectedTech.inspectionFee)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AvailabilityBadge status={selectedTech.status} />
                          <Button
                            size="sm"
                            className="tap h-9 font-semibold"
                            onClick={() => handleRequestTechNow(selectedTech)}
                          >
                            {t('map.request_now')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </CustomerLayout>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading Map Page...</div>}>
      <MapPageContent />
    </Suspense>
  )
}
