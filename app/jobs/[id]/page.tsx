import { AppTopbar } from "@/components/ustad/app-topbar"
import { JobTracker } from "@/components/ustad/job/job-tracker"
import { getTechnician, type Job } from "@/lib/data"

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Check if the parameter matches a technician ID to make mock data dynamic
  const technician = getTechnician(id)

  const job: Job = {
    id: id.startsWith("JOB-") ? id : "JOB-2481",
    service: technician
      ? `${technician.specialty} Service`
      : "Kitchen sink leak repair",
    technicianId: technician ? technician.id : "usman-khan",
    technicianName: technician ? technician.name : "Usman Khan",
    technicianInitials: technician ? technician.initials : "UK",
    technicianPhone: "+92 300 1234567",
    area: technician ? technician.area : "F-7, Islamabad",
    createdAt: "Jul 12, 2026",
    quoteAmount: technician
      ? (technician.inspectionFee > 0 ? technician.inspectionFee * 10 : 2500)
      : 2500,
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
