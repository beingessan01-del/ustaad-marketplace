import { notFound } from 'next/navigation'
import { getTechnician, defaultSchedule } from '@/lib/data'
import { TechnicianProfile } from '@/components/ustad/technician/technician-profile'
import { createClient } from '@/lib/supabase/server'

export default async function TechnicianPage({
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
        
        // Construct compatible Technician object structure
        technician = {
          id: profile.id,
          name: profile.full_name || 'USTAD Specialist',
          initials: (profile.full_name || 'T').split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2),
          specialty: details?.specialty || 'Service Professional',
          category: details?.service_categories?.[0] || 'plumbing',
          rating: 4.8,
          reviewCount: 14,
          distanceKm: 2.5,
          status: 'available',
          inspectionFee: 1500,
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
      console.error('Failed to query database for technician details fallback:', err)
    }
  }

  if (!technician) {
    notFound()
  }

  return <TechnicianProfile technician={technician} />
}
