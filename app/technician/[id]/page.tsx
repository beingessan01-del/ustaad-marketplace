import { notFound } from 'next/navigation'
import { getTechnician } from '@/lib/data'
import { TechnicianProfile } from '@/components/ustad/technician/technician-profile'

export default async function TechnicianPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const technician = getTechnician(id)

  if (!technician) {
    notFound()
  }

  return <TechnicianProfile technician={technician} />
}
