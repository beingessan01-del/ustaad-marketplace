'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  X,
  Phone,
  MessageSquare,
  ShieldCheck,
  Zap,
  MapPin,
  AlertTriangle,
  User,
  Wrench,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/ustad/app-topbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  serviceCategories,
  getTechnician,
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
  subscribeToLiveLocation,
  type JobRequest,
  type JobOffer,
} from '@/lib/storage-sync'
import { MapPlaceholder } from '@/components/ustad/map-placeholder'
import { StarRating } from '@/components/ustad/star-rating'
import { createClient } from '@/lib/supabase/client'

function InstantBookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams ? searchParams.get('category') : null
  const category = categoryParam || 'plumbing'

  const serviceCategory = serviceCategories.find((c) => c.id === category) || serviceCategories[0]

  // Unique request ID (Postgres bookings.id expects a valid UUID format)
  const requestIdRef = useRef<string>('')
  if (!requestIdRef.current && typeof window !== 'undefined') {
    requestIdRef.current = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }
  const requestId = requestIdRef.current

  // State
  const [status, setStatus] = useState<'searching' | 'matched' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'expired'>('searching')
  const [matchedTechId, setMatchedTechId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [radius, setRadius] = useState(1.5)
  const [techLat, setTechLat] = useState(33.72) // Starting point offset
  const [techLng, setTechLng] = useState(73.05)
  const [eta, setEta] = useState(6)
  const [connectionLost, setConnectionLost] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)

  // Map coordinates simulation for fallback/single-tab
  const [mapPinPos, setMapPinPos] = useState<{ top: string; left: string }>({ top: '15%', left: '15%' })

  const [custLat, setCustLat] = useState(33.7294)
  const [custLng, setCustLng] = useState(73.0561)
  const [showSimSettings, setShowSimSettings] = useState(false)

  const matchedTech = matchedTechId ? getTechnician(matchedTechId) : null

  // Elapsed timer
  useEffect(() => {
    if (status !== 'searching') return
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const nextTime = prev + 1
        // Auto-expand search radius
        if (nextTime === 10) {
          setRadius(3.0)
          updateDbRow<JobRequest>('job_requests', 'id', requestId, { search_radius_km: 3.0 })
        } else if (nextTime === 20) {
          setRadius(5.0)
          updateDbRow<JobRequest>('job_requests', 'id', requestId, { search_radius_km: 5.0 })
        } else if (nextTime >= 30) {
          // Timeout - expired
          clearInterval(timer)
          handleSearchExpired()
          return prev
        }
        return nextTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status])

  // Map tracking coordinates smoothing
  useEffect(() => {
    if (status !== 'en_route' && status !== 'arrived') return

    // Animate technician dot moving toward center (50%, 50%)
    let currentTop = 15
    let currentLeft = 15
    const steps = 40 // Move to center over 40 steps
    let currentStep = 0

    const moveTimer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const newTop = 15 + (50 - 15) * progress
      const newLeft = 15 + (50 - 15) * progress

      setMapPinPos({
        top: `${newTop}%`,
        left: `${newLeft}%`,
      })

      // Decrement ETA as they get closer
      if (currentStep % 8 === 0 && eta > 1) {
        setEta((prev) => Math.max(1, prev - 1))
      }

      if (currentStep >= steps) {
        clearInterval(moveTimer)
        setEta(0)
        // Transition state to arrived automatically in mockup simulation if not overridden
        updateDbRow<JobRequest>('job_requests', 'id', requestId, { status: 'arrived' })
      }
    }, 800)

    return () => clearInterval(moveTimer)
  }, [status === 'en_route'])

  // Heartbeat monitoring (Technician Offline detection)
  useEffect(() => {
    if (!matchedTechId || status === 'completed' || status === 'cancelled') return

    const connectionTimer = setInterval(() => {
      const onlineStatuses = getDbTable<any>('technician_status')
      const statusRow = onlineStatuses.find((s) => s.technician_id === matchedTechId)

      if (statusRow) {
        const timeDiff = Date.now() - statusRow.last_ping_at
        if (timeDiff > 12000 && statusRow.is_online) { // 12 seconds stale (representing connection loss)
          setConnectionLost(true)
        } else if (timeDiff <= 12000) {
          setConnectionLost(false)
        }
      }
    }, 4000)

    return () => clearInterval(connectionTimer)
  }, [matchedTechId, status])

  useEffect(() => {
    const supabaseClient = createClient()

    const createBookingInDb = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser()
        const customerId = user?.id

        if (!customerId) {
          alert('You must be logged in as a customer to request a booking. Redirecting to login...')
          router.push('/login')
          return
        }

        // Load simulated customer coordinates from localStorage if present
        let initialLat = 33.7294
        let initialLng = 73.0561
        if (typeof window !== 'undefined') {
          const storedLat = localStorage.getItem('ustad_customer_lat')
          const storedLng = localStorage.getItem('ustad_customer_lng')
          if (storedLat) {
            initialLat = Number(storedLat)
            setCustLat(initialLat)
          }
          if (storedLng) {
            initialLng = Number(storedLng)
            setCustLng(initialLng)
          }
        }

        // Insert into Supabase bookings table (status 'pending' fires matching trigger)
        const { error } = await supabaseClient.from('bookings').insert({
          id: requestId,
          customer_id: customerId,
          service_category: category,
          lat: initialLat,
          lng: initialLng,
          address: 'House 42, Street 18, F-7/2, Islamabad',
          status: 'pending',
          search_radius_km: 1.5,
          price_estimate: 1200,
        })

        if (error) {
          console.error('Failed to insert booking in Supabase:', error)
        }
      } catch (err) {
        console.error('Error during booking initialization:', err)
      }
    }

    createBookingInDb()

    // Subscribe to changes on the specific booking row in real-time via Supabase
    const channel = supabaseClient
      .channel(`booking_status_${requestId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${requestId}` },
        (payload) => {
          const currentReq = payload.new as any
          if (currentReq) {
            let clientStatus: any = currentReq.status
            if (clientStatus === 'pending') {
              clientStatus = 'searching'
            } else if (clientStatus === 'confirmed') {
              setStatus((prev) => {
                if (prev === 'searching') return 'matched'
                return prev // Keep client-side state machine
              })
              if (currentReq.technician_id) {
                setMatchedTechId(currentReq.technician_id)
              }
              return
            }

            setStatus(clientStatus)
            if (currentReq.technician_id) {
              setMatchedTechId(currentReq.technician_id)
            }
          }
        }
      )
      .subscribe()

    // Listen to live technician locations
    const unsubscribeLocation = subscribeToLiveLocation(requestId, (lat, lng) => {
      // Map coordinates to percentage for map display
      // Convert lat/lng offsets to relative percent
      const centerLat = 33.7294
      const centerLng = 73.0561
      const diffLat = lat - centerLat
      const diffLng = lng - centerLng

      // Simple relative projection to bounds
      const pctTop = 50 - (diffLat * 500)
      const pctLeft = 50 + (diffLng * 500)

      setMapPinPos({
        top: `${Math.max(5, Math.min(95, pctTop))}%`,
        left: `${Math.max(5, Math.min(95, pctLeft))}%`,
      })

      // Fetch real road route duration from OSRM (free service, no API key needed)
      fetch(`https://router.project-osrm.org/route/v1/driving/${lng},${lat};${centerLng},${centerLat}?overview=false`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.routes && data.routes[0]) {
            const durationMinutes = Math.ceil(data.routes[0].duration / 60)
            setEta(durationMinutes)
          }
        })
        .catch((err) => console.warn('Failed to fetch road ETA from OSRM:', err))
    })

    return () => {
      supabaseClient.removeChannel(channel)
      unsubscribeLocation()
    }
  }, [])

  const handleCancelSearch = () => {
    updateDbRow<JobRequest>('job_requests', 'id', requestId, { status: 'cancelled' })
    // Cancel any pending offers
    const offers = getDbTable<JobOffer>('job_offers')
    const updatedOffers = offers.map((o) =>
      o.job_request_id === requestId && o.status === 'pending'
        ? { ...o, status: 'expired' as const }
        : o
    )
    saveDbTable('job_offers', updatedOffers)
    router.push('/home')
  }

  const handleSearchExpired = () => {
    updateDbRow<JobRequest>('job_requests', 'id', requestId, { status: 'expired' })
    setStatus('expired')
  }

  // Developer panel action simulations (single-tab testing helper)
  const simulateDevAcceptance = () => {
    // Find a technician matching the category
    const availableTech = getTechnician('usman-khan') // Usman Khan is plumbing
    const techToMatch = matchedTech || availableTech || getTechnician('adnan-raza')!

    updateDbRow<JobRequest>('job_requests', 'id', requestId, {
      status: 'matched',
      matched_technician_id: techToMatch.id,
    })
    setMatchedTechId(techToMatch.id)
    setStatus('matched')

    // Simulate technician moving/heartbeat
    setTimeout(() => {
      updateDbRow<JobRequest>('job_requests', 'id', requestId, { status: 'en_route' })
    }, 2000)
  }

  const simulateDevStatusTransition = (nextStatus: any) => {
    updateDbRow<JobRequest>('job_requests', 'id', requestId, { status: nextStatus })
    if (nextStatus === 'completed') {
      // Simulate receipt confirmation
      setTimeout(() => {
        setConnectionLost(false)
      }, 500)
    }
  }

  const simulateDevConnectionLoss = () => {
    setConnectionLost((prev) => !prev)
  }

  const simulateNoTechsOnline = () => {
    handleSearchExpired()
  }

  return (
    <div className="flex min-h-svh flex-col bg-background pb-10">
      <AppTopbar />

      {/* Main layout container */}
      <main className="mx-auto w-full max-w-xl px-4 py-5 flex-1 flex flex-col gap-4">
        {/* Searching Screen */}
        {status === 'searching' && (
          <div className="flex-1 flex flex-col justify-between py-6 min-h-[500px]">
            <div className="text-center flex flex-col gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Finding a nearby technician...
              </h1>
              <p className="text-sm text-muted-foreground">
                Requesting {serviceCategory.label} instant dispatch
              </p>
              <div className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Search radius: {radius.toFixed(1)} km
              </div>
            </div>

            {/* Pulsing center search map */}
            <div className="relative my-8 flex size-60 mx-auto items-center justify-center rounded-full border border-primary/10 bg-primary/5">
              {/* Concentric pulsing rings */}
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/5 opacity-75" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-4 animate-ping rounded-full bg-primary/10 opacity-70" style={{ animationDuration: '2.5s' }} />
              <div className="absolute inset-10 animate-ping rounded-full bg-primary/15 opacity-60" style={{ animationDuration: '2s' }} />
              
              <div className="relative flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground soft-shadow">
                <serviceCategory.icon className="size-6 animate-pulse" />
              </div>
            </div>

            {/* Simulated Customer Location Panel */}
            <div className="w-full max-w-xs mx-auto border border-border/80 rounded-2xl bg-card p-3.5 flex flex-col gap-2.5 my-2">
              <button
                type="button"
                onClick={() => setShowSimSettings(!showSimSettings)}
                className="flex items-center justify-between text-xs font-semibold text-foreground w-full outline-none"
              >
                <span>Demo Controls: Simulated Location</span>
                <span className="text-primary font-mono text-[10px]">
                  {showSimSettings ? '▼ Collapse' : '▶ Expand'}
                </span>
              </button>

              {showSimSettings && (
                <div className="flex flex-col gap-2 pt-1.5 border-t border-border/40 animate-fadeIn">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Select Sector / Location Preset</label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value
                        if (val) {
                          const [latStr, lngStr] = val.split(',')
                          setCustLat(Number(latStr))
                          setCustLng(Number(lngStr))
                        }
                      }}
                      className="h-8 w-full rounded-lg border border-border bg-muted px-2 text-[11px] outline-none text-foreground focus:bg-background"
                    >
                      <option value="">-- Choose Preset Sector --</option>
                      <option value="33.7294,73.0561">Islamabad F-7 (Center)</option>
                      <option value="33.7125,73.0672">Islamabad Blue Area</option>
                      <option value="33.6895,73.0285">Islamabad G-9</option>
                      <option value="33.7422,73.0371">Islamabad E-7</option>
                      <option value="33.6592,73.0763">Islamabad I-9</option>
                      <option value="33.5936,73.0531">Rawalpindi Saddar</option>
                      <option value="33.6425,73.0728">Rawalpindi Commercial Market</option>
                      <option value="33.5186,73.0945">Rawalpindi Bahria Town</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={custLat}
                        onChange={(e) => setCustLat(Number(e.target.value))}
                        className="h-8 w-full rounded-lg border border-border bg-muted px-2 text-[11px] outline-none text-foreground focus:bg-background"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={custLng}
                        onChange={(e) => setCustLng(Number(e.target.value))}
                        className="h-8 w-full rounded-lg border border-border bg-muted px-2 text-[11px] outline-none text-foreground focus:bg-background"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="tap h-8 w-full mt-1 text-xs"
                    onClick={async () => {
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('ustad_customer_lat', String(custLat))
                        localStorage.setItem('ustad_customer_lng', String(custLng))
                      }
                      const supabaseClient = createClient()
                      const { error } = await supabaseClient
                        .from('bookings')
                        .update({ lat: custLat, lng: custLng })
                        .eq('id', requestId)
                      if (error) {
                        alert('Error updating customer location: ' + error.message)
                      } else {
                        alert('Customer location updated!')
                      }
                    }}
                  >
                    Update Location
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-bold font-mono tracking-widest text-foreground">
                  00:{elapsed < 10 ? `0${elapsed}` : elapsed}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  Elapsed Time
                </span>
              </div>

              <Button
                variant="destructive"
                size="lg"
                className="tap w-full max-w-xs h-12"
                onClick={handleCancelSearch}
              >
                Cancel Request
              </Button>
            </div>
          </div>
        )}

        {/* Expired Screen (No Technicians Found) */}
        {status === 'expired' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center gap-6 py-10">
            <div className="flex size-14 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AlertTriangle className="size-7" />
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <h2 className="text-lg font-bold text-foreground">No Technicians Available</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All nearby {serviceCategory.label.toLowerCase()} technicians are currently busy or offline. 
                Would you like to post this job to receive quotes over time instead?
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button
                size="lg"
                className="tap h-12 w-full"
                render={<Link href={`/booking/new?category=${category}`} />}
              >
                Schedule Quote Booking
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="tap h-12 w-full bg-transparent"
                render={<Link href="/home" />}
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Matched / En Route / Arrived / In Progress Screens */}
        {(status === 'matched' || status === 'en_route' || status === 'arrived' || status === 'in_progress' || status === 'completed') && (
          <div className="flex-1 flex flex-col justify-between gap-4">
            {/* Live map area */}
            <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-border">
              <MapPlaceholder
                className="h-full border-0"
                pins={[
                  { top: '50%', left: '50%' }, // Customer
                  { top: mapPinPos.top, left: mapPinPos.left, active: true }, // Technician
                ]}
              />

              {/* Status Header Badge on Map */}
              <div className="absolute top-3 left-3 z-10">
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-md",
                  status === 'matched' && "bg-[#EAF1FE] text-primary",
                  status === 'en_route' && "bg-blue-600 text-white animate-pulse",
                  status === 'arrived' && "bg-success text-success-foreground",
                  status === 'in_progress' && "bg-primary text-primary-foreground",
                  status === 'completed' && "bg-success-muted text-success"
                )}>
                  {status === 'matched' && "Technician Matched"}
                  {status === 'en_route' && `Technician en route — ETA ${eta}m`}
                  {status === 'arrived' && "Technician has Arrived!"}
                  {status === 'in_progress' && "Job is In Progress"}
                  {status === 'completed' && "Job Finished — Review Pending"}
                </span>
              </div>

              {/* Stale Connection Warning Alert overlay */}
              {connectionLost && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                  <div className="bg-card border border-destructive/20 rounded-xl p-4 max-w-xs soft-shadow flex flex-col gap-3 items-center text-center">
                    <AlertTriangle className="size-8 text-destructive animate-bounce" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Technician Offline</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        We lost the connection to the technician. Still trying to reach them...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status transitions text display */}
            <div className="flex flex-col gap-1 px-1">
              <h2 className="text-lg font-bold text-foreground">
                {status === 'matched' && "Preparing dispatch..."}
                {status === 'en_route' && "Technician is coming to you"}
                {status === 'arrived' && `${matchedTech?.name || 'Technician'} is at your address`}
                {status === 'in_progress' && "Work is underway..."}
                {status === 'completed' && "Work has been completed!"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {status === 'matched' && "The technician is reviewing map coordinates."}
                {status === 'en_route' && "Please keep your phone active for verification calls."}
                {status === 'arrived' && "Please greet the technician. Ask them to confirm code: 2481."}
                {status === 'in_progress' && "Once completed, pay cash to the technician directly."}
                {status === 'completed' && "Please pay the cash quote amount and leave a review."}
              </p>
            </div>

            {/* Match Detail Cards */}
            {matchedTech && (
              <div className="flex flex-col gap-3">
                {/* Tech Info Card */}
                <Card className="soft-shadow border-border">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl font-bold text-sm", matchedTech.avatarTint)}>
                      {matchedTech.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="font-semibold text-sm text-foreground truncate">{matchedTech.name}</span>
                        <StarRating rating={matchedTech.rating} size="sm" />
                      </div>
                      <p className="text-xs text-muted-foreground">{matchedTech.specialty}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Vehicle: Honda CD70 (RIR-1249) • Toolset Box</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Dispatch Details Card */}
                <Card className="soft-shadow border-border bg-muted/30">
                  <CardContent className="p-4 flex flex-col gap-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Job ID</span>
                      <span className="font-medium text-foreground">{requestId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address</span>
                      <span className="font-medium text-foreground truncate max-w-[200px]">House 42, Street 18, F-7/2</span>
                    </div>
                    <div className="flex justify-between border-t border-border/60 pt-2.5">
                      <span className="text-muted-foreground">Dispatch Fee (Cash)</span>
                      <span className="font-bold text-foreground text-sm">
                        {status === 'completed' ? formatPKR(matchedTech.inspectionFee + 500) : formatPKR(matchedTech.inspectionFee)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Call/Message Action Bar */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Button variant="outline" className="tap justify-center bg-transparent h-11" render={<a href={`tel:+923001234567`} />}>
                    <Phone className="size-4 mr-2" />
                    Call
                  </Button>
                  <Button 
                    variant="outline" 
                    className="tap justify-center bg-transparent h-11"
                    onClick={() => router.push(`/chat/${requestId}`)}
                  >
                    <MessageSquare className="size-4 mr-2" />
                    Chat
                  </Button>
                </div>

                {/* Cancel dispatch option */}
                {status !== 'completed' && (
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to cancel? Cancelling after match may incur a Rs. 150 cancellation charge.")) {
                        handleCancelSearch()
                      }
                    }}
                    className="text-xs text-center text-muted-foreground/60 hover:text-destructive underline mt-2 transition-colors"
                  >
                    Cancel Dispatch Request (cutoff fee applies)
                  </button>
                )}
              </div>
            )}

            {/* Rating Screen once completed */}
            {status === 'completed' && (
              <Card className="soft-shadow border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex flex-col items-center gap-4 text-center">
                  <div className="size-12 rounded-full bg-success/15 text-success flex items-center justify-center">
                    <CheckCircle className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Rate your dispatch experience</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your feedback helps keep the Ustad community safe and professional.
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <button key={stars} className="tap p-0.5 text-2xl text-[#FFB020] hover:scale-110 transition-transform">★</button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Provide any feedback..."
                    rows={2}
                    className="w-full text-xs p-2.5 rounded-xl border border-border bg-background outline-none resize-none focus:border-primary"
                  />
                  <Button
                    size="sm"
                    className="tap w-full max-w-[180px] h-9"
                    onClick={() => {
                      // Final complete reset
                      router.push('/home')
                    }}
                  >
                    Submit Review
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Floating Developer Simulation Control Widget (Beautiful Aesthetics) */}
      <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-md max-w-[240px] text-xs">
        <div className="flex items-center justify-between border-b border-border pb-1.5 mb-2">
          <span className="font-bold text-primary flex items-center gap-1">
            <Zap className="size-3.5 fill-primary" />
            Dev Simulation Panel
          </span>
          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
            State: {status}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {status === 'searching' && (
            <>
              <button
                onClick={simulateDevAcceptance}
                className="w-full text-left bg-primary text-primary-foreground rounded-lg py-1 px-2 hover:bg-primary/90 transition-colors font-medium flex items-center justify-between"
              >
                <span>Simulate Accept Match</span>
                <span className="font-mono text-[9px] bg-white/20 px-1 rounded">Ok</span>
              </button>
              <button
                onClick={simulateNoTechsOnline}
                className="w-full text-left bg-muted border border-border rounded-lg py-1 px-2 hover:bg-muted/80 transition-colors font-medium text-foreground"
              >
                Simulate No Techs Online
              </button>
            </>
          )}

          {status !== 'searching' && status !== 'expired' && status !== 'completed' && status !== 'cancelled' && (
            <>
              <div className="text-[10px] text-muted-foreground font-medium mb-0.5">Toggle Status:</div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  disabled={status === 'en_route'}
                  onClick={() => simulateDevStatusTransition('en_route')}
                  className={cn(
                    "rounded-lg py-1 px-1.5 border font-semibold text-center truncate transition-colors",
                    status === 'en_route' ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-muted text-foreground"
                  )}
                >
                  En route
                </button>
                <button
                  disabled={status === 'arrived'}
                  onClick={() => simulateDevStatusTransition('arrived')}
                  className={cn(
                    "rounded-lg py-1 px-1.5 border font-semibold text-center truncate transition-colors",
                    status === 'arrived' ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-muted text-foreground"
                  )}
                >
                  Arrived
                </button>
              </div>
              <button
                disabled={status === 'in_progress'}
                onClick={() => simulateDevStatusTransition('in_progress')}
                className={cn(
                  "rounded-lg py-1 px-2 border font-semibold text-center transition-colors w-full",
                  status === 'in_progress' ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-muted text-foreground"
                )}
              >
                Start Job (In Progress)
              </button>
              <button
                onClick={() => simulateDevStatusTransition('completed')}
                className="w-full bg-success text-success-foreground font-semibold rounded-lg py-1 px-2 hover:bg-success/90 transition-colors text-center"
              >
                Complete Job
              </button>
              <div className="border-t border-border/60 my-1 pt-1.5" />
              <button
                onClick={simulateDevConnectionLoss}
                className={cn(
                  "w-full rounded-lg py-1 px-2 border font-semibold transition-colors flex items-center justify-between",
                  connectionLost ? "bg-destructive/10 border-destructive text-destructive" : "border-border hover:bg-muted text-foreground"
                )}
              >
                <span>Simulate Connection Loss</span>
                <span className="size-2 rounded-full bg-current animate-pulse" />
              </button>
            </>
          )}

          <div className="text-[9px] text-muted-foreground text-center mt-1 border-t border-border/40 pt-1 leading-normal">
            Or open the **Technician Dashboard** in a second window/tab to test real-time tab syncing!
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InstantBookingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading booking option...</div>}>
      <InstantBookingContent />
    </Suspense>
  )
}
