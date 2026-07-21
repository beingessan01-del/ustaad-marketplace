import { notFound } from "next/navigation"
import { Suspense } from "react"
import { AppTopbar } from "@/components/ustad/app-topbar"
import { BookingFlow } from "@/components/ustad/booking/booking-flow"
import { getTechnician, defaultSchedule } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let technician = getTechnician(id)

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
          reviews: [
            {
              id: 'rev-1',
              name: 'Zainab Ahmed',
              rating: 5,
              comment: 'Very professional and fast service. Highly recommended!',
              date: '2 days ago',
            }
          ]
        }
      }
    } catch (err) {
      console.error('Failed to query database for booking technician fallback:', err)
    }
  }

  if (!technician) notFound()

  return (
    <div className="min-h-svh bg-muted/40">
      <AppTopbar />
      <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading booking options...</div>}>
        <BookingFlow technician={technician} />
      </Suspense>
    </div>
  )
}

