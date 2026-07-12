"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Phone,
  MessageSquare,
  CheckCircle2,
  Circle,
  Loader2,
  Banknote,
  ShieldCheck,
  MapPin,
  Star,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { StarRating } from "@/components/ustad/star-rating"
import { MapPlaceholder } from "@/components/ustad/map-placeholder"
import { formatPKR, type Job, type JobStatusKey } from "@/lib/data"

const stepOrder: JobStatusKey[] = [
  "requested",
  "quote_sent",
  "approved",
  "in_progress",
  "completed",
  "payment_confirmed",
]

export function JobTracker({ job }: { job: Job }) {
  const [currentStep, setCurrentStep] = useState<JobStatusKey>(job.currentStep)
  const [customerConfirmed, setCustomerConfirmed] = useState(job.customerConfirmed)
  const [technicianConfirmed, setTechnicianConfirmed] = useState(job.technicianConfirmed)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [rating, setRating] = useState(5)
  const [quoteAmount, setQuoteAmount] = useState(job.quoteAmount)

  const bothConfirmed = customerConfirmed && technicianConfirmed
  const effectiveStep: JobStatusKey = bothConfirmed ? "payment_confirmed" : currentStep
  const effectiveIndex = stepOrder.indexOf(effectiveStep)

  const steps = useMemo(() => job.steps, [job.steps])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Link href="/home" className="text-sm text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">Job {job.id}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-balance">{job.service}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {/* Live status card */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Job status</CardTitle>
              <StatusPill step={effectiveStep} />
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col">
                {steps.map((step, i) => {
                  const done = i < effectiveIndex
                  const active = i === effectiveIndex
                  const isLast = i === steps.length - 1
                  return (
                    <li key={step.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full border transition-colors",
                            done && "border-success bg-success text-success-foreground",
                            active && "border-primary bg-primary text-primary-foreground",
                            !done && !active && "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="size-4" />
                          ) : active ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Circle className="size-3" />
                          )}
                        </span>
                        {!isLast && (
                          <span
                            className={cn(
                              "my-1 w-0.5 flex-1 rounded-full",
                              i < effectiveIndex ? "bg-success" : "bg-border",
                            )}
                          />
                        )}
                      </div>
                      <div className={cn("pb-6", isLast && "pb-0")}>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            !done && !active && "text-muted-foreground",
                          )}
                        >
                          {step.label}
                        </p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        {step.timestamp && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{step.timestamp}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>

          {/* Quote Review & Approval Card */}
          {currentStep === "quote_sent" && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base text-primary">Quote Received</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {job.technicianName} has reviewed your request and sent a fixed quote.
                </p>
                <div className="flex items-center justify-between rounded-xl bg-background p-4 border border-border">
                  <span className="text-sm text-muted-foreground">Fixed Quote</span>
                  <span className="text-xl font-bold">{formatPKR(quoteAmount)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="lg"
                    className="tap flex-1"
                    onClick={() => setCurrentStep("approved")}
                  >
                    Approve &amp; Schedule
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="tap flex-1 bg-transparent"
                    onClick={() => setCurrentStep("requested")}
                  >
                    Negotiate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live location while in progress */}
          {effectiveIndex >= stepOrder.indexOf("approved") &&
            effectiveIndex < stepOrder.indexOf("completed") && (
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="size-4 text-primary" />
                    Technician location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MapPlaceholder className="h-56" pins={[{ top: "38%", left: "46%", active: true }]} />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {job.technicianName} is en route to {job.area}.
                  </p>
                </CardContent>
              </Card>
            )}

          {/* Cash payment confirmation */}
          {effectiveIndex >= stepOrder.indexOf("completed") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Banknote className="size-4 text-success" />
                  Confirm cash payment
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-xl bg-muted p-4">
                  <span className="text-sm text-muted-foreground">Amount due (cash)</span>
                  <span className="text-lg font-bold">{formatPKR(job.quoteAmount)}</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ConfirmTile
                    label="You"
                    confirmed={customerConfirmed}
                    caption={customerConfirmed ? "Confirmed payment" : "Tap after paying cash"}
                  />
                  <ConfirmTile
                    label={job.technicianName}
                    confirmed={technicianConfirmed}
                    caption={technicianConfirmed ? "Confirmed receipt" : "Waiting for technician"}
                  />
                </div>

                {!bothConfirmed ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      size="lg"
                      className="tap w-full"
                      disabled={customerConfirmed}
                      onClick={() => setCustomerConfirmed(true)}
                    >
                      {customerConfirmed ? "Waiting for technician to confirm" : "I paid in cash"}
                    </Button>
                    {customerConfirmed && !technicianConfirmed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="tap w-full text-xs text-primary"
                        onClick={() => setTechnicianConfirmed(true)}
                      >
                        (Simulate technician confirming receipt)
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-success-muted p-4 text-success">
                    <ShieldCheck className="size-5" />
                    <p className="text-sm font-medium">
                      Payment confirmed by both parties. Job complete.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Review */}
          {(bothConfirmed || currentStep === "payment_confirmed") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rate your experience</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {reviewSubmitted ? (
                  <div className="flex items-center gap-2 rounded-xl bg-success-muted p-4 text-success">
                    <CheckCircle2 className="size-5" />
                    <p className="text-sm font-medium">Thanks for your feedback!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={`Rate ${i + 1} stars`}
                          onClick={() => setRating(i + 1)}
                          className="tap p-1"
                        >
                          <Star
                            className={cn(
                              "size-7",
                              i < rating
                                ? "fill-[#FFB020] text-[#FFB020]"
                                : "fill-muted text-muted-foreground/40",
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      placeholder={`Tell others about your experience with ${job.technicianName}...`}
                      rows={3}
                    />
                    <Button className="tap w-fit" onClick={() => setReviewSubmitted(true)}>
                      Submit review
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: technician + support */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your technician</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="bg-[#EAF1FE] font-semibold text-primary">
                    {job.technicianInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <Link
                    href={`/technician/${job.technicianId}`}
                    className="font-semibold hover:text-primary"
                  >
                    {job.technicianName}
                  </Link>
                  <div className="mt-0.5">
                    <StarRating rating={4.9} size="sm" showValue />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="tap justify-center bg-transparent" render={<a href={`tel:${job.technicianPhone.replace(/\s/g, "")}`} />}>
                  <Phone data-icon="inline-start" />
                  Call
                </Button>
                <Button variant="outline" className="tap justify-center bg-transparent">
                  <MessageSquare data-icon="inline-start" />
                  Chat
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DetailRow label="Job ID" value={job.id} />
              <DetailRow label="Service" value={job.service} />
              <DetailRow label="Location" value={job.area} />
              <DetailRow label="Requested" value={job.createdAt} />
              <Separator />
              <DetailRow
                label="Quote"
                value={formatPKR(job.quoteAmount)}
                emphasize
              />
              <p className="text-xs text-muted-foreground">
                Cash on completion. No payment is taken through the app.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/40 shadow-none">
            <CardContent className="flex items-start gap-3 py-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">USTAD Protection</p>
                <p className="text-sm text-muted-foreground">
                  Every job is backed by verified technicians and dispute support.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Premium floating state switcher controller for test flow verification */}
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-background/90 px-4 py-2.5 backdrop-blur-md soft-shadow">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="text-primary tracking-wide text-[10px] uppercase">Test Flow:</span>
          <div className="flex gap-1">
            {stepOrder.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setCurrentStep(s)
                  if (s === "payment_confirmed") {
                    setCustomerConfirmed(true)
                    setTechnicianConfirmed(true)
                  } else if (s === "completed") {
                    setCustomerConfirmed(false)
                    setTechnicianConfirmed(false)
                  } else {
                    setCustomerConfirmed(false)
                    setTechnicianConfirmed(false)
                    setReviewSubmitted(false)
                  }
                }}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] transition-colors border",
                  currentStep === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted hover:text-foreground"
                )}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ step }: { step: JobStatusKey }) {
  const map: Record<JobStatusKey, { label: string; className: string }> = {
    requested: { label: "Requested", className: "bg-muted text-muted-foreground" },
    quote_sent: { label: "Quote sent", className: "bg-[#FFF7E8] text-[#B27A00]" },
    approved: { label: "Approved", className: "bg-[#EAF1FE] text-primary" },
    in_progress: { label: "In progress", className: "bg-[#EAF1FE] text-primary" },
    completed: { label: "Awaiting payment", className: "bg-[#FFF7E8] text-[#B27A00]" },
    payment_confirmed: { label: "Completed", className: "bg-success-muted text-success" },
  }
  const s = map[step]
  return (
    <Badge className={cn("border-transparent font-medium", s.className)}>{s.label}</Badge>
  )
}

function ConfirmTile({
  label,
  caption,
  confirmed,
}: {
  label: string
  caption: string
  confirmed: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-3 transition-colors",
        confirmed ? "border-success bg-success-muted" : "border-border bg-card",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        {confirmed ? (
          <CheckCircle2 className="size-5 text-success" />
        ) : (
          <Circle className="size-5 text-muted-foreground/40" />
        )}
      </div>
      <span className="text-xs text-muted-foreground">{caption}</span>
    </div>
  )
}

function DetailRow({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right", emphasize ? "text-base font-bold" : "font-medium")}>
        {value}
      </span>
    </div>
  )
}
