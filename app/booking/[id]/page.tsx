import { notFound } from "next/navigation"
import { Suspense } from "react"
import { AppTopbar } from "@/components/ustad/app-topbar"
import { BookingFlow } from "@/components/ustad/booking/booking-flow"
import { getTechnician } from "@/lib/data"

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const technician = getTechnician(id)
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
