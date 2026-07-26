import { AppTopbar } from "@/components/ustad/app-topbar"
import { JobTracker } from "@/components/ustad/job/job-tracker"
import { getTechnician, defaultSchedule, type Job } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // 1. Check static list first
  let technician = getTechnician(id)

  // 2. DB Fallback if technician not in static list
  if (!technician) {
    try {
      const supabase = await createClient()
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single()

      if (profile) {
        const { data: details } = await supabase.from('technician_details').select('*').eq('profile_id', id).single()
        const ratingVal = details?.avg_rating ? Number(details.avg_rating) : 4.8
        let calculatedFee = 300
        if (ratingVal >= 4.5) {
          calculatedFee = 300
        } else if (ratingVal >= 3.5) {
          calculatedFee = 250
        } else {
          calculatedFee = 200
        }

        technician = {
          id: profile.id,
          name: profile.full_name || 'USTAD Specialist',
          initials: (profile.full_name || 'T').split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2),
          specialty: details?.specialty || 'Service Professional',
          category: details?.service_categories?.[0] || 'plumbing',
          rating: ratingVal,
          reviewCount: 14,
          distanceKm: 2.5,
          status: 'available',
          inspectionFee: calculatedFee,
          area: 'F-7, Islamabad',
          experienceYears: details?.years_experience || 2,
          jobsCompleted: 18,
          about: details?.bio || 'USTAD Verified Partner.',
          avatarTint: 'bg-primary/10 text-primary',
          schedule: defaultSchedule,
          reviews: []
        }
      }
    } catch (err) {
      console.error('Failed to query database for job technician:', err)
    }
  }

  // Slug fallback if id contains hyphenated name (e.g. muhammad-abdullah)
  const fallbackName = id.includes('-')
    ? id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'USTAD Specialist'

  const job: Job = {
    id: id.startsWith("JOB-") ? id : "JOB-2481",
    service: technician
      ? `${technician.specialty} Service`
      : "Service Request",
    technicianId: technician ? technician.id : id,
    technicianName: technician ? technician.name : fallbackName,
    technicianInitials: technician
      ? technician.initials
      : fallbackName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    technicianPhone: "+92 300 1234567",
    area: technician ? technician.area : "F-7, Islamabad",
    createdAt: "Jul 12, 2026",
    quoteAmount: technician
      ? (technician.inspectionFee > 0 ? technician.inspectionFee : (technician.rating >= 4.8 ? 300 : technician.rating >= 4.5 ? 250 : 200))
      : 300,
    currentStep: "in_progress",
    customerConfirmed: false,
    technicianConfirmed: false,
    steps: [
      {
        key: "requested",
        label: "Requested",
        description: "Job request sent to technician",
        timestamp: "Jul 12, 09:14 AM",
      },
      {
        key: "quote_sent",
        label: "Quote Sent",
        description: "Technician shared a fixed quote",
        timestamp: "Jul 12, 09:42 AM",
      },
      {
        key: "approved",
        label: "Approved",
        description: "You approved the quote",
        timestamp: "Jul 12, 10:05 AM",
      },
      {
        key: "in_progress",
        label: "In Progress",
        description: "Technician is working on the job",
        timestamp: "Jul 12, 11:20 AM",
      },
      {
        key: "completed",
        label: "Completed",
        description: "Work finished, awaiting confirmation",
        timestamp: null,
      },
      {
        key: "payment_confirmed",
        label: "Payment Confirmed",
        description: "Cash payment confirmed by both parties",
        timestamp: null,
      },
    ],
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <AppTopbar />
      <JobTracker job={job} />
    </div>
  )
}
