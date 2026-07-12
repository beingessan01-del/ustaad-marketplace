'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Briefcase,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Technician } from '@/lib/data'
import { StarRating } from '../star-rating'
import { AvailabilityBadge } from '../availability-badge'
import { BookingPanelContent } from './booking-panel'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export function TechnicianProfile({ technician }: { technician: Technician }) {
  return (
    <div className="min-h-dvh bg-background pb-24 lg:pb-10">
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 px-4 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3">
          <Link
            href="/home"
            className="tap flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <span className="text-sm font-semibold text-foreground">
            Technician profile
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* main column */}
          <div className="flex flex-col gap-6">
            {/* header card */}
            <div className="rounded-2xl border border-border bg-card p-5 soft-shadow">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex size-16 shrink-0 items-center justify-center rounded-2xl text-lg font-bold',
                    technician.avatarTint,
                  )}
                >
                  {technician.initials}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                      {technician.name}
                    </h1>
                    <BadgeCheck className="size-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {technician.specialty}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StarRating
                      rating={technician.rating}
                      reviewCount={technician.reviewCount}
                      size="md"
                    />
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-4" />
                      {technician.area}
                    </span>
                    <AvailabilityBadge status={technician.status} />
                  </div>
                </div>
              </div>

              {/* stats */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat
                  icon={Award}
                  value={`${technician.experienceYears} yrs`}
                  label="Experience"
                />
                <Stat
                  icon={Briefcase}
                  value={technician.jobsCompleted.toLocaleString('en-PK')}
                  label="Jobs done"
                />
                <Stat
                  icon={BadgeCheck}
                  value={technician.rating.toFixed(1)}
                  label="Rating"
                />
              </div>
            </div>

            {/* about */}
            <section className="rounded-2xl border border-border bg-card p-5 soft-shadow">
              <h2 className="mb-2 text-base font-semibold text-foreground">
                About
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {technician.about}
              </p>
            </section>

            {/* reviews */}
            <section className="rounded-2xl border border-border bg-card p-5 soft-shadow">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">
                  Reviews
                </h2>
                <StarRating
                  rating={technician.rating}
                  reviewCount={technician.reviewCount}
                />
              </div>
              <div className="flex flex-col gap-4">
                {technician.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex flex-col gap-1.5 border-b border-border pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {review.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {review.date}
                      </span>
                    </div>
                    <StarRating rating={review.rating} />
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* desktop sticky sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-5 soft-shadow">
              <BookingPanelContent technician={technician} />
            </div>
          </aside>
        </div>
      </main>

      {/* mobile bottom bar → sheet */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button size="lg" className="tap h-12 w-full">
                Request Quote
              </Button>
            }
          />
          <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-6 pt-2">
            <SheetHeader className="px-0">
              <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border" />
              <SheetTitle>Book {technician.name}</SheetTitle>
            </SheetHeader>
            <BookingPanelContent technician={technician} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Award
  value: string
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/60 py-3">
      <Icon className="size-4 text-primary" />
      <span className="text-sm font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
