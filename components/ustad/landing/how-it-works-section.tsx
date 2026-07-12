import { FileText, GitCompare, HandCoins } from 'lucide-react'

const steps = [
  {
    icon: FileText,
    title: 'Post a job',
    description:
      'Describe what you need, add a photo, and pick a time that suits you.',
  },
  {
    icon: GitCompare,
    title: 'Compare verified quotes',
    description:
      'Receive upfront, fixed quotes from nearby verified technicians and choose.',
  },
  {
    icon: HandCoins,
    title: 'Pay on completion',
    description:
      'Approve the quote, get the work done, and pay only after you confirm it.',
  },
]

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="bg-muted/50 py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex max-w-xl flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            How USTAD works
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Three simple steps from problem to fixed — no haggling, no surprises.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div
                key={step.title}
                className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 soft-shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-2xl font-bold text-border">
                    0{i + 1}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
