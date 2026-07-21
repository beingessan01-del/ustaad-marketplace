'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Info,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPKR, serviceCategories, defaultSchedule, type Technician } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { SchedulePicker } from '../schedule-picker'

const steps = ['Describe', 'Estimate', 'Schedule', 'Review'] as const

export function BookingFlow({ technician }: { technician?: Technician }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams ? searchParams.get('category') : null
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState(technician?.category || categoryParam || 'plumbing')
  const [description, setDescription] = useState('')
  const [photoAdded, setPhotoAdded] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        setPhotoUrl(base64)
        setPhotoAdded(true)
        if (technician?.id) {
          localStorage.setItem(`ustad_booking_photo_${technician.id}`, base64)
        } else {
          localStorage.setItem(`ustad_booking_photo_new`, base64)
        }
      }
      reader.readAsDataURL(file)
    }
  }
  const [quoteApproved, setQuoteApproved] = useState(false)
  const [slot, setSlot] = useState<string | null>(null)
  const [selectedDayLabel, setSelectedDayLabel] = useState<string>('Today')

  const scheduleDays = technician?.schedule || defaultSchedule

  const canProceed = () => {
    if (step === 0) return description.trim().length > 5
    if (step === 1) return quoteApproved
    if (step === 2) return slot !== null
    return true
  }

  const next = () => {
    if (step < steps.length - 1) setStep((s) => s + 1)
    else {
      // Navigate to the dynamic job page representing the booked technician
      const id = technician?.id || 'usman-khan'
      router.push(`/jobs/${id}`)
    }
  }

  const back = () => {
    if (step > 0) setStep((s) => s - 1)
    else {
      if (technician) {
        router.push(`/technician/${technician.id}`)
      } else {
        router.push('/home')
      }
    }
  }

  return (
    <div className="min-h-dvh bg-background pb-28">
      {/* top bar with progress */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 px-4 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3">
          <button
            type="button"
            onClick={back}
            className="tap flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-sm font-semibold text-foreground">
            {technician ? `Book ${technician.name}` : 'New booking'}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            Step {step + 1} of {steps.length}
          </span>
        </div>
        {/* step indicator */}
        <div className="mx-auto max-w-xl pb-3">
          <div className="flex items-center gap-1.5">
            {steps.map((label, i) => (
              <div key={label} className="flex flex-1 flex-col gap-1.5">
                <div
                  className={cn(
                    'h-1 rounded-full transition-colors',
                    i <= step ? 'bg-primary' : 'bg-border',
                  )}
                />
                <span
                  className={cn(
                    'text-[0.7rem] font-medium',
                    i <= step ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6">
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                What do you need help with?
              </h1>
              <p className="text-sm text-muted-foreground">
                Tell us about the job so technicians can prepare an accurate quote.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Service category
              </label>
              {technician ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      {(() => {
                        const cat = serviceCategories.find((c) => c.id === category)
                        if (!cat) return null
                        const Icon = cat.icon
                        return <Icon className="size-4.5" />
                      })()}
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-foreground">
                        {serviceCategories.find((c) => c.id === category)?.label}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Booked with {technician.name}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Locked
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {serviceCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        'tap flex flex-col items-center gap-1.5 rounded-xl border p-3',
                        category === c.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:bg-muted',
                      )}
                    >
                      <c.icon
                        className={cn(
                          'size-5',
                          category === c.id ? 'text-primary' : 'text-muted-foreground',
                        )}
                      />
                      <span className="text-xs font-medium text-foreground">
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="desc" className="text-sm font-medium text-foreground">
                Describe the problem
              </label>
              <textarea
                id="desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Kitchen sink is leaking from the base and water collects under the cabinet."
                className="w-full resize-none rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-background"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Add a photo <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  if (photoUrl) {
                    setPhotoUrl(null)
                    setPhotoAdded(false)
                    if (technician?.id) {
                      localStorage.removeItem(`ustad_booking_photo_${technician.id}`)
                    } else {
                      localStorage.removeItem(`ustad_booking_photo_new`)
                    }
                  } else {
                    fileInputRef.current?.click()
                  }
                }}
                className={cn(
                  'tap flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed overflow-hidden relative',
                  photoAdded
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/50 hover:bg-muted',
                )}
              >
                {photoUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center p-1.5">
                    <img src={photoUrl} alt="Preview" className="h-24 max-h-24 object-cover rounded-lg" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                      <span className="text-[10px] font-bold text-white bg-destructive/95 px-2.5 py-1 rounded-md">Remove Photo</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImagePlus className="size-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Tap to upload a photo
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Estimated price range
              </h1>
              <p className="text-sm text-muted-foreground">
                Based on similar jobs in your area. This is not the final price.
              </p>
            </div>

            {/* AI estimate card */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  AI estimate
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-foreground">
                {technician?.category === 'painting' ? `${formatPKR(8000)} – ${formatPKR(15000)}` :
                 technician?.category === 'electrical' ? `${formatPKR(1500)} – ${formatPKR(3000)}` :
                 `${formatPKR(2000)} – ${formatPKR(3500)}`}
              </p>
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-background/70 p-3">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Estimate only — the final quote requires the technician&apos;s
                  approval after they review your job details.
                </p>
              </div>
            </div>

            {/* mandatory quote approval */}
            <div
              className={cn(
                'rounded-2xl border-2 p-5 transition-colors',
                quoteApproved ? 'border-success bg-success-muted/40' : 'border-warning',
              )}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className={cn(
                    'size-5',
                    quoteApproved ? 'text-success' : 'text-warning',
                  )}
                />
                <h2 className="text-sm font-semibold text-foreground">
                  Quote approval required
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                No work begins until you approve a fixed quote from your chosen
                technician. This protects you from surprise charges.
              </p>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-background p-3 border border-border/50">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={quoteApproved}
                  onClick={() => setQuoteApproved((v) => !v)}
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                    quoteApproved
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card',
                  )}
                >
                  {quoteApproved && <Check className="size-3.5" />}
                </button>
                <span className="text-sm text-foreground">
                  I understand that the estimate is not final and I&apos;ll
                  approve a fixed quote before any work starts.
                </span>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                When should we come?
              </h1>
              <p className="text-sm text-muted-foreground">
                Pick a preferred date and time slot.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <SchedulePicker
                schedule={scheduleDays}
                onSelect={(dayLabel, timeSlot) => {
                  setSelectedDayLabel(dayLabel)
                  setSlot(timeSlot)
                }}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Review your request
              </h1>
              <p className="text-sm text-muted-foreground">
                Confirm the details before we notify nearby technicians.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 soft-shadow">
              <ReviewRow
                label="Service"
                value={
                  serviceCategories.find((c) => c.id === category)?.label ?? '—'
                }
              />
              {technician && (
                <ReviewRow
                  label="Technician"
                  value={technician.name}
                />
              )}
              <ReviewRow label="Description" value={description || '—'} />
              <ReviewRow
                label="Preferred time"
                value={
                  slot ? `${selectedDayLabel}, ${slot}` : 'Not selected'
                }
              />
              <ReviewRow label="Location" value={technician?.area || "F-7, Islamabad"} />
              {photoUrl && (
                <div className="flex flex-col gap-1.5 border-t border-border/40 pt-2.5">
                  <span className="text-[11px] text-muted-foreground">Photo Attachment</span>
                  <img src={photoUrl} alt="Attached Preview" className="w-20 h-20 object-cover rounded-lg border border-border mt-0.5" />
                </div>
              )}
              <div className="border-t border-border pt-3">
                <ReviewRow
                  label="Estimated range"
                  value={technician?.category === 'painting' ? `${formatPKR(8000)} – ${formatPKR(15000)}` :
                         technician?.category === 'electrical' ? `${formatPKR(1500)} – ${formatPKR(3000)}` :
                         `${formatPKR(2000)} – ${formatPKR(3500)}`}
                  emphasize
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-success-muted p-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
              <p className="text-xs leading-relaxed text-foreground">
                You&apos;ll only pay after the job is completed and you confirm
                you&apos;re satisfied.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* sticky footer */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              size="lg"
              className="tap h-12 flex-1 bg-transparent"
              onClick={back}
            >
              Back
            </Button>
          )}
          <Button
            size="lg"
            className="tap h-12 flex-[2]"
            disabled={!canProceed()}
            onClick={next}
          >
            {step === steps.length - 1 ? 'Confirm request' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReviewRow({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-right text-sm',
          emphasize
            ? 'font-bold text-foreground'
            : 'font-medium text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}
