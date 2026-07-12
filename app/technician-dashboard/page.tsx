'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Wrench,
  Zap,
  MapPin,
  AlertTriangle,
  User,
  CheckCircle,
  Clock,
  Navigation,
  Phone,
  Power,
  Shield,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/ustad/app-topbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  technicians,
  formatPKR,
  type Technician,
} from '@/lib/data'
import {
  getDbTable,
  saveDbTable,
  insertDbRow,
  updateDbRow,
  subscribeToDbTable,
  broadcastLiveLocation,
  type JobRequest,
  type JobOffer,
  type TechnicianStatus,
} from '@/lib/storage-sync'
import { MapPlaceholder } from '@/components/ustad/map-placeholder'

export default function TechnicianDashboardPage() {
  const router = useRouter()

  // Selected technician simulation profile
  const [selectedTechId, setSelectedTechId] = useState<string>('usman-khan')
  const activeTech = technicians.find((t) => t.id === selectedTechId) || technicians[0]

  // Statuses
  const [isOnline, setIsOnline] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  
  // Pending request modal
  const [incomingRequest, setIncomingRequest] = useState<JobRequest | null>(null)
  const [countdown, setCountdown] = useState(20)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Simulation driving parameters
  const [isDriving, setIsDriving] = useState(false)
  const [driveProgress, setDriveProgress] = useState(0)

  // Active Job Details
  const activeJob = activeJobId 
    ? getDbTable<JobRequest>('job_requests').find((r) => r.id === activeJobId) 
    : null

  // Heartbeat ping interval
  useEffect(() => {
    if (!isOnline) {
      // Remove online status
      const statuses = getDbTable<TechnicianStatus>('technician_status')
      const filtered = statuses.filter((s) => s.technician_id !== selectedTechId)
      saveDbTable('technician_status', filtered)
      return
    }

    // Insert or update heartbeat immediately
    const sendHeartbeat = () => {
      const statuses = getDbTable<TechnicianStatus>('technician_status')
      const index = statuses.findIndex((s) => s.technician_id === selectedTechId)
      
      const newStatus: TechnicianStatus = {
        technician_id: selectedTechId,
        is_online: true,
        current_lat: 33.7200, // Slightly offset
        current_lng: 73.0500,
        last_ping_at: Date.now(),
        active_job_id: activeJobId,
      }

      if (index !== -1) {
        statuses[index] = newStatus
      } else {
        statuses.push(newStatus)
      }
      saveDbTable('technician_status', statuses)
    }

    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 5000) // 5s heartbeat

    return () => clearInterval(interval)
  }, [isOnline, selectedTechId, activeJobId])

  // Sync active job status from local DB
  useEffect(() => {
    const syncJobState = () => {
      if (!activeJobId) return
      const requests = getDbTable<JobRequest>('job_requests')
      const job = requests.find((r) => r.id === activeJobId)
      if (job) {
        if (job.status === 'cancelled') {
          alert('Customer has cancelled the dispatch request.')
          handleResetDashboard()
        } else if (job.status === 'completed' || job.status === 'expired') {
          handleResetDashboard()
        }
      }
    }

    const unsubscribe = subscribeToDbTable('job_requests', syncJobState)
    return () => unsubscribe()
  }, [activeJobId])

  // Watch for incoming job requests
  useEffect(() => {
    if (!isOnline || activeJobId || incomingRequest) return

    const checkForRequests = () => {
      const requests = getDbTable<JobRequest>('job_requests')
      // Find a searching request that matches this technician's category
      const pending = requests.find(
        (r) => r.status === 'searching' && r.service_category === activeTech.category
      )

      if (pending) {
        // Trigger modal & countdown
        setIncomingRequest(pending)
        setCountdown(20)
      }
    }

    checkForRequests()
    const unsubscribe = subscribeToDbTable('job_requests', checkForRequests)
    return () => unsubscribe()
  }, [isOnline, activeJobId, incomingRequest, activeTech.category])

  // Modal Countdown Timer
  useEffect(() => {
    if (!incomingRequest) return

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!)
          handleDeclineInvite()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [incomingRequest])

  // Dispatch driving coordinates heartbeat simulation (Customer tracking)
  useEffect(() => {
    if (!isDriving || !activeJobId) return

    const startLat = 33.7200
    const startLng = 73.0500
    const destLat = 33.7294 // Customer address
    const destLng = 73.0561

    const steps = 40
    let currentStep = 0

    const driveTimer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const currentLat = startLat + (destLat - startLat) * progress
      const currentLng = startLng + (destLng - startLng) * progress

      // Broadcast position ping
      broadcastLiveLocation(activeJobId, currentLat, currentLng)

      if (currentStep >= steps) {
        clearInterval(driveTimer)
        setIsDriving(false)
      }
    }, 800)

    return () => clearInterval(driveTimer)
  }, [isDriving, activeJobId])

  const handleDeclineInvite = () => {
    setIncomingRequest(null)
    setCountdown(20)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
  }

  const handleAcceptInvite = () => {
    if (!incomingRequest) return

    // ATOMIC matched check: read latest database state
    const requests = getDbTable<JobRequest>('job_requests')
    const latestReq = requests.find((r) => r.id === incomingRequest.id)

    if (!latestReq || latestReq.status !== 'searching') {
      alert('Invite no longer available. Another technician accepted first.')
      handleDeclineInvite()
      return
    }

    // Success! Accept job atomically
    updateDbRow<JobRequest>('job_requests', 'id', incomingRequest.id, {
      status: 'matched',
      matched_technician_id: activeTech.id,
    })

    setActiveJobId(incomingRequest.id)
    setIncomingRequest(null)

    // Trigger driving simulation
    setIsDriving(true)

    // Automatically transition to en_route
    setTimeout(() => {
      updateDbRow<JobRequest>('job_requests', 'id', incomingRequest.id, {
        status: 'en_route',
      })
    }, 1500)
  }

  const handleStatusChange = (newStatus: 'arrived' | 'in_progress' | 'completed') => {
    if (!activeJobId) return
    updateDbRow<JobRequest>('job_requests', 'id', activeJobId, { status: newStatus })

    if (newStatus === 'completed') {
      alert('Job completed successfully! Cash payment of ' + formatPKR(activeTech.inspectionFee + 500) + ' collected.')
      handleResetDashboard()
    }
  }

  const handleResetDashboard = () => {
    setActiveJobId(null)
    setIsDriving(false)
    setDriveProgress(0)
    setIncomingRequest(null)
  }

  return (
    <div className="min-h-svh bg-background pb-10">
      <AppTopbar />

      <main className="mx-auto w-full max-w-xl px-4 py-5 flex flex-col gap-4">
        {/* Profile Switcher Header */}
        <Card className="soft-shadow border-border">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Technician Profile Simulator</span>
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                Active ID: {activeTech.initials}
              </div>
            </div>
            <select
              value={selectedTechId}
              onChange={(e) => {
                setSelectedTechId(e.target.value)
                handleResetDashboard()
              }}
              className="w-full rounded-xl border border-border bg-muted p-2.5 text-sm text-foreground outline-none focus:border-primary focus:bg-background"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.specialty})
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Dashboard Actions HUD */}
        {!activeJobId ? (
          <div className="flex flex-col gap-4 py-4 flex-1">
            {/* Status card */}
            <Card className={cn(
              "border-2 transition-all soft-shadow",
              isOnline ? "border-success/30 bg-success/5" : "border-border bg-card"
            )}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-bold text-foreground">
                    {isOnline ? "You are Online" : "You are Offline"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isOnline ? "Ready to receive instant dispatch requests." : "Toggle switch to start location heartbeat."}
                  </p>
                </div>

                <button
                  onClick={() => setIsOnline((prev) => !prev)}
                  className={cn(
                    "tap flex size-12 shrink-0 items-center justify-center rounded-full text-white transition-colors soft-shadow",
                    isOnline ? "bg-success hover:bg-success/95" : "bg-muted-foreground/40 hover:bg-muted-foreground/50"
                  )}
                  aria-label="Toggle Online status"
                >
                  <Power className="size-5" />
                </button>
              </CardContent>
            </Card>

            {/* Offline Helper notice */}
            {!isOnline && (
              <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-4 border border-border/40 text-xs text-muted-foreground leading-normal">
                <Shield className="size-4 shrink-0 text-primary mt-0.5" />
                <p>
                  Dispatch matching requires PostGIS simulated heartbeats. 
                  Toggle **Online** above to make this profile searchable for the customer page search radius check.
                </p>
              </div>
            )}

            {/* Waiting heartbeat loader animation */}
            {isOnline && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center gap-4">
                <span className="relative flex size-10 items-center justify-center">
                  <span className="absolute inline-flex inset-0 rounded-full bg-success/30 animate-ping" />
                  <span className="relative inline-flex size-6 rounded-full bg-success soft-shadow" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Waiting for incoming jobs...</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Simulating GPS heartbeat ping at (33.72, 73.05) every 5s
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Active Dispatch Navigation Flow */
          <div className="flex flex-col gap-4 flex-1">
            {/* Live Navigation Map */}
            <div className="relative h-60 w-full rounded-2xl overflow-hidden border border-border">
              <MapPlaceholder
                className="h-full border-0"
                pins={[
                  { top: '50%', left: '50%', active: true }, // Customer destination
                  { top: isDriving ? '30%' : '50%', left: isDriving ? '30%' : '50%' }, // Technician current location
                ]}
              />
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                  <Navigation className="size-3.5 animate-pulse" />
                  Navigation Active
                </span>
              </div>
            </div>

            {/* Stage Info Headers */}
            <div className="flex flex-col gap-1 px-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Active Dispatch Status
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-[#EAF1FE] px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                  {activeJob?.status}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground mt-1">
                {activeJob?.status === 'matched' && "Preparing dispatch route"}
                {activeJob?.status === 'en_route' && "Driving to customer's address"}
                {activeJob?.status === 'arrived' && "You have arrived"}
                {activeJob?.status === 'in_progress' && "Job is in progress"}
              </h2>
            </div>

            {/* Customer Contact Detail Card */}
            <Card className="soft-shadow border-border bg-muted/20">
              <CardContent className="p-4 flex flex-col gap-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer ID</span>
                  <span className="font-semibold text-foreground">CUST-1 (F-7, Islamabad)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exact Address</span>
                  <span className="font-bold text-foreground">House 42, Street 18, F-7/2, Islamabad</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2.5">
                  <span className="text-muted-foreground">Collectable Fee (Cash)</span>
                  <span className="font-bold text-foreground text-sm">
                    {activeJob?.status === 'in_progress' ? formatPKR(activeTech.inspectionFee + 500) : formatPKR(activeTech.inspectionFee)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Stage Action Triggers */}
            <div className="flex flex-col gap-2 mt-2">
              {activeJob?.status === 'en_route' && (
                <Button
                  size="lg"
                  className="tap h-12 w-full bg-success hover:bg-success/95 text-white"
                  onClick={() => handleStatusChange('arrived')}
                >
                  I Have Arrived
                </Button>
              )}

              {activeJob?.status === 'arrived' && (
                <Button
                  size="lg"
                  className="tap h-12 w-full bg-primary hover:bg-primary/95 text-white"
                  onClick={() => handleStatusChange('in_progress')}
                >
                  Start Job
                </Button>
              )}

              {activeJob?.status === 'in_progress' && (
                <Button
                  size="lg"
                  className="tap h-12 w-full bg-success hover:bg-success/95 text-white"
                  onClick={() => handleStatusChange('completed')}
                >
                  Complete Job & Collect Cash
                </Button>
              )}

              {/* Emergency Contact Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button variant="outline" className="tap justify-center bg-transparent h-11" render={<a href={`tel:+923001234567`} />}>
                  <Phone className="size-4 mr-2" />
                  Call Customer
                </Button>
                <Button variant="outline" className="tap justify-center bg-transparent h-11" render={<a href={`sms:+923001234567`} />}>
                  <MessageSquare className="size-4 mr-2" />
                  Chat Customer
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Incoming Job Invite Modal (Full-Screen overlay) */}
      {incomingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden soft-shadow animate-in fade-in zoom-in duration-200">
            <CardHeader className="bg-primary/5 border-b border-border/40 p-4">
              <CardTitle className="text-base flex items-center gap-2 text-primary font-bold">
                <Zap className="size-5 fill-primary" />
                Incoming Dispatch Request!
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col items-center gap-4 text-center">
              {/* Circular Countdown Ring */}
              <div className="relative flex size-20 items-center justify-center">
                <svg className="absolute inset-0 size-full -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="stroke-muted fill-none"
                    strokeWidth="4"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="stroke-primary fill-none transition-all duration-1000"
                    strokeWidth="4"
                    strokeDasharray={213.6}
                    strokeDashoffset={213.6 - (213.6 * countdown) / 20}
                  />
                </svg>
                <span className="text-xl font-bold font-mono text-foreground">{countdown}s</span>
              </div>

              {/* Request Details */}
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-foreground capitalize">
                  {incomingRequest.service_category} Request
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center mt-1">
                  <MapPin className="size-3.5 text-primary" />
                  Distance: 1.2 km away • Area: F-7, Islamabad
                </p>
                <p className="text-xs text-primary font-bold mt-1.5 uppercase tracking-wider">
                  Guaranteed fee: {formatPKR(activeTech.inspectionFee)}
                </p>
              </div>

              <div className="border-t border-border/40 w-full my-1" />

              <div className="grid grid-cols-2 gap-2 w-full mt-1.5">
                <Button
                  variant="outline"
                  size="lg"
                  className="tap h-12 w-full bg-transparent font-semibold border-border hover:bg-muted text-foreground"
                  onClick={handleDeclineInvite}
                >
                  Decline
                </Button>
                <Button
                  size="lg"
                  className="tap h-12 w-full bg-primary font-bold text-white shadow-lg hover:bg-primary/95"
                  onClick={handleAcceptInvite}
                >
                  Accept Job
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
