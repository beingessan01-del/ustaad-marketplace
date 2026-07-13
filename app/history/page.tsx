'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Wrench,
  Zap,
  Cog,
  PaintRoller,
  SprayCan,
  Hammer,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Star,
  RefreshCw,
  Navigation,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomerLayout } from '@/components/ustad/customer-layout'
import { AppTopbar } from '@/components/ustad/app-topbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/lib/i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  getDbTable,
  getDbTableAsync,
  saveDbTable,
  updateDbRow,
  insertDbRow,
  type JobRequest,
} from '@/lib/storage-sync'
import {
  technicians,
  formatPKR,
  serviceCategories,
  type Technician,
  type Review,
} from '@/lib/data'
import { StarRating } from '@/components/ustad/star-rating'

type HistoryTab = 'upcoming' | 'completed' | 'cancelled'

function HistoryPageContent() {
  const router = useRouter()
  const { t, locale, isRtl } = useTranslation()

  // State
  const [activeTab, setActiveTab] = useState<HistoryTab>('upcoming')
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobRequest[]>([])
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

  // Detail Sheet / Rating Form states
  const [selectedJob, setSelectedJob] = useState<JobRequest | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  // Map category IDs to Lucide Icons
  const categoryIcons: Record<string, any> = {
    plumbing: Wrench,
    electrical: Zap,
    mechanic: Cog,
    painting: PaintRoller,
    cleaning: SprayCan,
    carpentry: Hammer,
  }

  // category tints for icons
  const categoryTintClasses: Record<string, string> = {
    plumbing: 'bg-[#EAF1FE] text-primary',
    electrical: 'bg-[#FFF7E8] text-[#E0A100]',
    mechanic: 'bg-[#F0EEFF] text-[#5B5BD6]',
    painting: 'bg-[#E6FAF4] text-success',
    cleaning: 'bg-[#EAF1FE] text-primary',
    carpentry: 'bg-[#FFF0EE] text-warning',
  }

  // Populate history, fetching from Supabase first
  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true)
      const currentList = await getDbTableAsync<JobRequest>('job_requests')

      if (currentList.length === 0) {
        const mockHistory: JobRequest[] = [
          {
            id: 'JOB-9104',
            customer_id: 'CUST-1',
            service_category: 'plumbing',
            lat: 33.7294,
            lng: 73.0561,
            address: 'House 42, Street 18, F-7/2, Islamabad',
            status: 'completed',
            created_at: Date.now() - 3 * 24 * 60 * 60 * 1000,
            matched_technician_id: 'usman-khan',
            search_radius_km: 1.5,
          },
          {
            id: 'JOB-8492',
            customer_id: 'CUST-1',
            service_category: 'electrical',
            lat: 33.7294,
            lng: 73.0561,
            address: 'House 42, Street 18, F-7/2, Islamabad',
            status: 'completed',
            created_at: Date.now() - 15 * 24 * 60 * 60 * 1000,
            matched_technician_id: 'adnan-raza',
            search_radius_km: 1.5,
          },
          {
            id: 'JOB-4819',
            customer_id: 'CUST-1',
            service_category: 'carpentry',
            lat: 33.7294,
            lng: 73.0561,
            address: 'House 42, Street 18, F-7/2, Islamabad',
            status: 'cancelled',
            created_at: Date.now() - 1 * 24 * 60 * 60 * 1000,
            matched_technician_id: 'naveed-akhtar',
            search_radius_km: 1.5,
          },
        ]
        saveDbTable('job_requests', mockHistory)
        setJobs(mockHistory)
      } else {
        const sorted = [...currentList].sort((a, b) => b.created_at - a.created_at)
        setJobs(sorted)
      }
      setLoading(false)
    }

    loadJobs()
  }, [activeTab])

  // Filter jobs by active tab
  const filteredJobs = jobs.filter((job) => {
    if (activeTab === 'upcoming') {
      return ['searching', 'matched', 'en_route', 'arrived', 'in_progress'].includes(job.status)
    }
    if (activeTab === 'completed') {
      return job.status === 'completed'
    }
    if (activeTab === 'cancelled') {
      return job.status === 'cancelled' || job.status === 'expired'
    }
    return false
  })

  // Format date helper
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Book Again helper
  const handleBookAgain = (job: JobRequest) => {
    router.push(`/booking/instant?category=${job.service_category}&techId=${job.matched_technician_id}`)
  }

  // Handle completed job detail click
  const handleJobClick = (job: JobRequest) => {
    if (activeTab === 'upcoming') {
      // Link back to active live tracking page
      router.push(`/booking/instant?category=${job.service_category}`)
    } else {
      setSelectedJob(job)
      setRating(5)
      setComment('')
      setReviewSubmitted(false)
    }
  }

  // Handle submitting a review on completed job detail
  const handleSubmitJobReview = () => {
    if (!selectedJob || !selectedJob.matched_technician_id) return

    const techId = selectedJob.matched_technician_id
    const tech = techList.find(t => t.id === techId)

    if (tech) {
      // Append review
      const newRev: Review = {
        id: 'r_new_' + Math.random(),
        name: 'Kamran Malik', // logged-in user name
        rating,
        comment: comment || 'Professional service!',
        date: 'Just now',
      }
      
      // Update local array (simulate persistence in technicians count)
      tech.reviews.push(newRev)
      // Recalculate average rating
      const totalRatingsSum = tech.reviews.reduce((acc, r) => acc + r.rating, 0)
      tech.rating = totalRatingsSum / tech.reviews.length
      tech.reviewCount = tech.reviews.length
    }

    setReviewSubmitted(true)
    setTimeout(() => {
      setSelectedJob(null)
    }, 1500)
  }

  return (
    <CustomerLayout>
      <div className="min-h-svh bg-background pb-20">
        <AppTopbar />

        <main className="mx-auto w-full max-w-xl px-4 py-5 flex flex-col gap-4">
          <h1 className="text-base font-bold tracking-tight text-foreground">
            {t('history.history_header')}
          </h1>

          {/* Pill Tabs at the Top */}
          <div className="flex rounded-xl bg-muted p-1 w-full">
            <button
              onClick={() => {
                setActiveTab('upcoming')
                setSelectedJob(null)
              }}
              className={cn(
                "tap flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all",
                activeTab === 'upcoming'
                  ? "bg-card text-primary shadow-sm"
                  : "text-[#6F767E] hover:text-foreground"
              )}
            >
              {t('history.tab_upcoming')}
            </button>
            <button
              onClick={() => {
                setActiveTab('completed')
                setSelectedJob(null)
              }}
              className={cn(
                "tap flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all",
                activeTab === 'completed'
                  ? "bg-card text-primary shadow-sm"
                  : "text-[#6F767E] hover:text-foreground"
              )}
            >
              {t('history.tab_completed')}
            </button>
            <button
              onClick={() => {
                setActiveTab('cancelled')
                setSelectedJob(null)
              }}
              className={cn(
                "tap flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all",
                activeTab === 'cancelled'
                  ? "bg-card text-primary shadow-sm"
                  : "text-[#6F767E] hover:text-foreground"
              )}
            >
              {t('history.tab_cancelled')}
            </button>
          </div>

          {/* List items rendering */}
          {loading ? (
            // loading skeletons
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredJobs.length === 0 ? (
                // Empty states
                <Card className="border border-dashed border-border py-12 text-center soft-shadow bg-card">
                  <CardContent className="p-0 flex flex-col gap-2.5 items-center">
                    <Clock className="size-8 text-muted-foreground/55" />
                    <p className="text-xs text-muted-foreground italic">
                      {activeTab === 'upcoming' && t('history.no_upcoming')}
                      {activeTab === 'completed' && t('history.no_completed')}
                      {activeTab === 'cancelled' && t('history.no_cancelled')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredJobs.map((job) => {
                  const tech = techList.find((t) => t.id === job.matched_technician_id)
                  const categoryInfo = serviceCategories.find((c) => c.id === job.service_category)
                  const Icon = categoryIcons[job.service_category] || Wrench
                  const tint = categoryTintClasses[job.service_category] || 'bg-primary/10'

                  return (
                    <div
                      key={job.id}
                      onClick={() => handleJobClick(job)}
                      className="tap rounded-2xl border border-border bg-card p-4 hover:border-primary/20 transition-all flex items-start gap-3 relative soft-shadow"
                    >
                      {/* Icon */}
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl font-bold", tint)}>
                        <Icon className="size-4.5" />
                      </span>

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1 pr-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground font-medium font-mono">{job.id}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(job.created_at)}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {categoryInfo?.label || 'General Home'} Service
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {tech ? `Technician: ${tech.name}` : 'Awaiting Match'}
                        </p>
                        
                        {/* Status badges */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            {job.status === 'completed' && <CheckCircle className="size-3.5 text-success" />}
                            {(job.status === 'cancelled' || job.status === 'expired') && <XCircle className="size-3.5 text-destructive" />}
                            {['matched', 'en_route', 'arrived', 'in_progress'].includes(job.status) && (
                              <Navigation className="size-3.5 text-primary animate-pulse" />
                            )}
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              job.status === 'completed' && "text-success",
                              (job.status === 'cancelled' || job.status === 'expired') && "text-destructive",
                              ['matched', 'en_route', 'arrived', 'in_progress'].includes(job.status) && "text-primary"
                            )}>
                              {job.status === 'completed' && t('job.status_payment_confirmed')}
                              {job.status === 'cancelled' && t('history.tab_cancelled')}
                              {job.status === 'expired' && "Expired"}
                              {job.status === 'searching' && "Searching"}
                              {job.status === 'matched' && "Matched"}
                              {job.status === 'en_route' && "En Route"}
                              {job.status === 'arrived' && "Arrived"}
                              {job.status === 'in_progress' && "In Progress"}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-foreground font-mono">
                            {tech ? formatPKR(tech.inspectionFee + (job.status === 'completed' ? 500 : 0)) : '—'}
                          </span>
                        </div>

                        {/* Cancel reasons */}
                        {(job.status === 'cancelled' || job.status === 'expired') && (
                          <p className="text-[10px] text-destructive/80 font-medium mt-1 leading-normal">
                            {job.status === 'cancelled' 
                              ? t('history.cancelled_reason', { reason: 'Customer requested cancellation.' })
                              : t('history.cancelled_reason', { reason: 'No technicians responded within the limit.' })
                            }
                          </p>
                        )}
                      </div>

                      {/* Right indicator */}
                      <ChevronRight className="size-4 text-muted-foreground/50 absolute end-3 top-1/2 -translate-y-1/2" />
                    </div>
                  )
                })
              )}
            </div>
          )}
        </main>

        {/* Completed Job Review Modal popup details */}
        {selectedJob && (
          <Dialog open={selectedJob !== null} onOpenChange={(open) => { if (!open) setSelectedJob(null) }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{t('history.job_rating_title')}</DialogTitle>
                <DialogDescription>
                  Job ID: {selectedJob.id} • Completed on {formatDate(selectedJob.created_at)}
                </DialogDescription>
              </DialogHeader>

              {reviewSubmitted ? (
                <div className="flex flex-col items-center justify-center gap-3 py-6 text-center text-success animate-in fade-in duration-200">
                  <CheckCircle className="size-12 animate-bounce" />
                  <span className="text-sm font-semibold">{t('job.thanks_feedback')}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 py-2">
                  <div className="flex items-center justify-center gap-1 text-2xl">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <button
                        key={stars}
                        onClick={() => setRating(stars)}
                        className="tap p-0.5"
                      >
                        <Star className={cn(
                          "size-7 transition-transform",
                          stars <= rating ? "fill-[#FFB020] text-[#FFB020] scale-105" : "text-muted-foreground/30"
                        )} />
                      </button>
                    ))}
                  </div>

                  <textarea
                    placeholder={t('job.review_placeholder', { name: techList.find(t => t.id === selectedJob.matched_technician_id)?.name || 'Technician' })}
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-border bg-muted outline-none focus:border-primary focus:bg-background resize-none leading-normal"
                  />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="tap flex-1 bg-transparent font-semibold border-border"
                      onClick={() => handleBookAgain(selectedJob)}
                    >
                      <RefreshCw className="size-3.5 mr-1.5" />
                      {t('history.book_again')}
                    </Button>
                    <Button
                      className="tap flex-1 font-bold"
                      onClick={handleSubmitJobReview}
                    >
                      Submit Review
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </CustomerLayout>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading History Page...</div>}>
      <HistoryPageContent />
    </Suspense>
  )
}
