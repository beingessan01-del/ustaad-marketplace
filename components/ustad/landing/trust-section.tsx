import Link from 'next/link'
import { BadgeCheck, Tag, HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'

const pillars = [
  {
    icon: BadgeCheck,
    title: 'Verified Technicians',
    description:
      'Every technician passes ID verification, skill checks, and background screening before joining.',
  },
  {
    icon: Tag,
    title: 'Upfront Pricing',
    description:
      'See a fixed quote before any work starts. No hidden charges, no negotiation games.',
  },
  {
    icon: HandCoins,
    title: 'Pay After Completion',
    description:
      'Your money stays with you until the job is done and you confirm you are satisfied.',
  },
]

export function TrustSection() {
  return (
    <section id="trust" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="rounded-3xl border border-border bg-card p-6 soft-shadow sm:p-10">
        <div className="mx-auto mb-10 flex max-w-xl flex-col items-center gap-2 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Built on trust
          </span>
          <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Why thousands choose USTAD
          </h2>
          <p className="text-pretty text-sm text-muted-foreground sm:text-base">
            We removed the risk from hiring home help. Here&apos;s how we keep
            you protected.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon
            return (
              <div
                key={pillar.title}
                className="flex flex-col items-center gap-3 rounded-2xl bg-muted/60 p-6 text-center"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Icon className="size-6" />
                </span>
                <h3 className="text-base font-semibold text-foreground">
                  {pillar.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Button size="lg" className="tap px-6" nativeButton={false} render={<Link href="/signup" />}>
            Get Started — it&apos;s free
          </Button>
          <p className="text-xs text-muted-foreground">
            No credit card required. Book in minutes.
          </p>
        </div>
      </div>
    </section>
  )
}
