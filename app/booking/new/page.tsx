import { Suspense } from "react"
import { AppTopbar } from "@/components/ustad/app-topbar"
import { BookingFlow } from "@/components/ustad/booking/booking-flow"

export default function GeneralBookingPage() {
  return (
    <div className="min-h-svh bg-muted/40">
      <AppTopbar />
      <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading booking options...</div>}>
        <BookingFlow />
      </Suspense>
    </div>
  )
}
