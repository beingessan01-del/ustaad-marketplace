import Link from 'next/link'
import { Search, MapPin, ChevronDown, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20 sm:pb-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          Every technician is verified & background-checked
        </span>

        <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Trusted home service technicians in Islamabad & Rawalpindi
        </h1>

        <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Book verified plumbers, electricians, mechanics and more. Compare
          upfront quotes and pay only when the job is done right.
        </p>

        {/* search bar */}
        <div className="mt-8 w-full max-w-2xl">
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 soft-shadow sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-muted px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="What service do you need?"
                className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="hidden h-6 w-px bg-border sm:block" />

            <button
              type="button"
              className="tap flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground sm:bg-transparent sm:px-2"
            >
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="font-medium">F-7, Islamabad</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>

            <Button size="lg" className="tap h-11 px-5" render={<Link href="/home" />}>
              Search
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span>10,000+ jobs completed</span>
          <span className="hidden size-1 rounded-full bg-border sm:block" />
          <span>1,200+ verified technicians</span>
          <span className="hidden size-1 rounded-full bg-border sm:block" />
          <span>4.9 average rating</span>
        </div>
      </div>
    </section>
  )
}
