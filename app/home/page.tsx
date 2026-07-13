'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, Zap, Wrench } from 'lucide-react'
import { CustomerLayout } from '@/components/ustad/customer-layout'
import { AppTopbar } from '@/components/ustad/app-topbar'
import { ServiceCard } from '@/components/ustad/service-card'
import { TechnicianCard } from '@/components/ustad/technician-card'
import { MapPlaceholder } from '@/components/ustad/map-placeholder'
import { Button } from '@/components/ui/button'
import { serviceCategories, technicians } from '@/lib/data'
import { useTranslation, TranslatedText } from '@/lib/i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

import { useEffect } from 'react'

export default function HomePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [techList, setTechList] = useState(technicians)

  useEffect(() => {
    async function fetchTechnicians() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('account_type', 'technician')
        
        if (data && data.length > 0) {
          const mapped = data.map((profile: any, idx: number) => {
            const mock = technicians[idx % technicians.length]
            return {
              ...mock,
              id: profile.id,
              name: profile.name || mock.name,
              initials: (profile.name || mock.name).split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
              specialty: mock.specialty,
              category: mock.category,
            }
          })
          setTechList(mapped)
        }
      } catch (e) {
        console.warn('Failed to fetch technicians from Supabase, falling back to mock list:', e)
      }
    }
    fetchTechnicians()
  }, [])

  return (
    <CustomerLayout>
      <div className="pb-10">
        <AppTopbar />

        <main className="mx-auto max-w-3xl px-4 py-5">
          {/* search */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-muted px-3 focus-within:bg-background transition-colors">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('home.search_placeholder')}
                className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Button
              size="icon-lg"
              className="tap size-11 shrink-0"
              aria-label="Filters"
            >
              <SlidersHorizontal />
            </Button>
          </div>

          {/* services */}
          <section className="mt-7">
            <h2 className="mb-3 text-base font-semibold text-foreground">
              <TranslatedText k="home.services_title" />
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {serviceCategories.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setSelectedCategory(service.id)
                  }}
                />
              ))}
            </div>
          </section>

          {/* nearby with map */}
          <section className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                <TranslatedText k="home.nearby_title" />
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-muted px-2 py-0.5 text-xs font-medium text-success">
                <span className="size-1.5 animate-pulse rounded-full bg-success" />
                <TranslatedText k="home.live_badge" />
              </span>
            </div>
            <MapPlaceholder className="h-48" />
          </section>

          {/* technician list */}
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                <TranslatedText k="home.technicians_near_you" variables={{ count: String(techList.length) }} />
              </h2>
              <button className="text-sm font-medium text-primary hover:underline">
                <TranslatedText k="home.sort_button" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {techList.map((technician) => (
                <TechnicianCard key={technician.id} technician={technician} />
              ))}
            </div>
          </section>
        </main>

        {/* Booking Method Selection Dialog */}
        <Dialog open={selectedCategory !== null} onOpenChange={(open) => { if (!open) setSelectedCategory(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                <TranslatedText k="home.select_booking_method" />
              </DialogTitle>
              <DialogDescription>
                <TranslatedText
                  k="home.how_to_book"
                  variables={{
                    service: selectedCategory
                      ? serviceCategories.find(c => c.id === selectedCategory)?.label.toLowerCase() || 'service'
                      : 'service'
                  }}
                />
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 py-2">
              {/* Option 1: Request Now */}
              <button
                onClick={() => {
                  router.push(`/booking/instant?category=${selectedCategory}`)
                  setSelectedCategory(null)
                }}
                className="tap flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors animate-in fade-in duration-200"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Zap className="size-5" />
                </span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    <TranslatedText k="home.instant_dispatch" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <TranslatedText k="home.instant_dispatch_desc" />
                  </p>
                </div>
              </button>

              {/* Option 2: Get Quotes */}
              <button
                onClick={() => {
                  router.push(`/booking/new?category=${selectedCategory}`)
                  setSelectedCategory(null)
                }}
                className="tap flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-muted transition-colors animate-in fade-in duration-200"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Wrench className="size-5" />
                </span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    <TranslatedText k="home.quote_booking" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <TranslatedText k="home.quote_booking_desc" />
                  </p>
                </div>
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* sticky bottom CTA */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:hidden">
          <div className="mx-auto max-w-3xl">
            <Button
              size="lg"
              className="tap h-12 w-full text-sm font-bold"
              onClick={() => setSelectedCategory('plumbing')}
            >
              <TranslatedText k="home.book_cta" />
            </Button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  )
}
