'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Wrench,
  User,
  CheckCircle,
  Clock,
  Navigation,
  Phone,
  Power,
  Shield,
  MessageSquare,
  DollarSign,
  Star,
  MapPin,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/ustad/app-topbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { MapPlaceholder } from '@/components/ustad/map-placeholder'

type Tab = 'dashboard' | 'history' | 'profile' | 'messages'

export default function TechnicianDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  // User Profile States
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [details, setDetails] = useState<any>(null)
  
  // Tab control
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  // Status & Heartbeats
  const [isOnline, setIsOnline] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [activeJob, setActiveJob] = useState<any>(null)
  const [geoWatchId, setGeoWatchId] = useState<number | null>(null)

  // Incoming Requests & Offers
  const [offers, setOffers] = useState<any[]>([])
  const [incomingOffer, setIncomingOffer] = useState<any>(null)
  const [countdown, setCountdown] = useState(20)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Stats Counters
  const [earningsToday, setEarningsToday] = useState(0)
  const [completedToday, setCompletedToday] = useState(0)
  
  // History logs
  const [historyJobs, setHistoryJobs] = useState<any[]>([])
  const [earningsSummary, setEarningsSummary] = useState({ week: 0, month: 0 })
  const [chatThreads, setChatThreads] = useState<any[]>([])

  // Settings Forms
  const [bio, setBio] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [experience, setExperience] = useState(1)
  const [categories, setCategories] = useState<string[]>([])
  const [radius, setRadius] = useState(10)
  const [savingSettings, setSavingSettings] = useState(false)
  const [mockGps, setMockGps] = useState(true)
  const [mockLat, setMockLat] = useState(33.7294)
  const [mockLng, setMockLng] = useState(73.0561)

  // Fetch messages thread history
  useEffect(() => {
    if (!userId || activeTab !== 'messages') return

    async function loadChatThreads() {
      const { data: bookingsList } = await supabase
        .from('bookings')
        .select('*, job_messages(*), profiles:customer_id(full_name)')
        .eq('technician_id', userId)
        .order('created_at', { ascending: false })

      if (bookingsList) {
        const threads = bookingsList.map((b: any) => {
          const msgs = b.job_messages || []
          const sortedMsgs = [...msgs].sort((x: any, y: any) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())
          const latestMsg = sortedMsgs[0]

          return {
            id: b.id,
            category: b.service_category,
            status: b.status,
            partnerName: b.profiles?.full_name || 'Customer Client',
            latestText: latestMsg ? latestMsg.content : 'No messages yet',
            timestamp: latestMsg ? new Date(latestMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(b.created_at).toLocaleDateString(),
            unread: latestMsg ? (latestMsg.sender_id !== userId && !latestMsg.read_at) : false,
          }
        })
        setChatThreads(threads)
      }
    }
    loadChatThreads()
  }, [userId, activeTab])

  // 1. Fetch User and initial DB data
  useEffect(() => {
    async function initUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)
      
      // Load Profile
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      // Load Technician Details
      const { data: det } = await supabase.from('technician_details').select('*').eq('profile_id', user.id).single()
      if (det) {
        setDetails(det)
        setBio(det.bio || '')
        setSpecialty(det.specialty || '')
        setExperience(det.years_experience || 1)
        setCategories(det.service_categories || [])
        setRadius(Number(det.service_radius_km) || 10)
      }

      // Load mock location config
      if (typeof window !== 'undefined') {
        const storedMockGps = localStorage.getItem('ustad_mock_gps')
        const storedMockLat = localStorage.getItem('ustad_mock_lat')
        const storedMockLng = localStorage.getItem('ustad_mock_lng')
        if (storedMockGps !== null) setMockGps(storedMockGps === 'true')
        if (storedMockLat !== null) setMockLat(Number(storedMockLat))
        if (storedMockLng !== null) setMockLng(Number(storedMockLng))
      }

      if (!det) {
        // Create default details if missing
        const defaultDet = {
          profile_id: user.id,
          specialty: 'Plumbing Specialist',
          bio: 'Registered USTAD Partner',
          years_experience: 2,
          service_categories: ['plumbing'],
          service_radius_km: 10,
        }
        await supabase.from('technician_details').upsert(defaultDet)
        setBio(defaultDet.bio)
        setSpecialty(defaultDet.specialty)
        setExperience(defaultDet.years_experience)
        setCategories(defaultDet.service_categories)
        setRadius(defaultDet.service_radius_km)
      }

      // Check current active job or status
      const { data: status } = await supabase.from('technician_status').select('*').eq('technician_id', user.id).single()
      if (status) {
        setIsOnline(status.is_online)
        if (status.active_job_id) {
          setActiveJobId(status.active_job_id)
        }
      }
    }
    initUser()
  }, [])

  // 2. Geolocation Watcher when Online
  useEffect(() => {
    if (!isOnline || !userId) {
      if (geoWatchId !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchId)
        setGeoWatchId(null)
      }
      // Update status to offline in database
      if (userId) {
        supabase.from('technician_status').upsert({
          technician_id: userId,
          is_online: false,
          last_ping_at: new Date().toISOString(),
        }).then(() => {})
      }
      return
    }

    if (mockGps) {
      // Mock location periodic updates
      const mockInterval = setInterval(async () => {
        await supabase.from('technician_status').upsert({
          technician_id: userId,
          is_online: true,
          current_lat: mockLat,
          current_lng: mockLng,
          last_ping_at: new Date().toISOString(),
          active_job_id: activeJobId || null,
        })
      }, 4000)

      return () => {
        clearInterval(mockInterval)
      }
    }

    if (typeof window !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          // Upsert online status and heartbeat
          await supabase.from('technician_status').upsert({
            technician_id: userId,
            is_online: true,
            current_lat: lat,
            current_lng: lng,
            last_ping_at: new Date().toISOString(),
            active_job_id: activeJobId || null,
          })
        },
        (error) => {
          console.error('GPS error:', error)
          setIsOnline(false)
          alert('GPS Location access is required to go Online and receive job requests. Please check browser permissions.')
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
      setGeoWatchId(watchId)
    } else {
      alert('Your browser does not support GPS location.')
      setIsOnline(false)
    }

    return () => {
      if (geoWatchId !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchId)
      }
    }
  }, [isOnline, userId, activeJobId, mockGps, mockLat, mockLng])

  // 3. Stats and History Queries
  useEffect(() => {
    if (!userId) return

    async function loadStatsAndHistory() {
      // Load completed bookings for this technician
      const { data: completedBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('technician_id', userId)
        .order('created_at', { ascending: false })

      if (completedBookings) {
        const today = new Date().toISOString().split('T')[0]
        
        // Filter jobs completed today
        const todayJobs = completedBookings.filter((b: any) => b.status === 'completed' && b.created_at.startsWith(today))
        setCompletedToday(todayJobs.length)
        
        // Calculate earnings today
        const todayEarned = todayJobs.reduce((acc: number, cur: any) => acc + (Number(cur.price) || 0), 0)
        setEarningsToday(todayEarned)

        // Map to history list
        const historyList = completedBookings.map((b: any) => ({
          id: b.id,
          category: b.service_category,
          date: new Date(b.created_at).toLocaleDateString(),
          price: b.price || 0,
          status: b.status,
          initials: 'CUST',
        }))
        setHistoryJobs(historyList)

        // Calculate weekly / monthly sum
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const monthAgo = new Date()
        monthAgo.setDate(monthAgo.getDate() - 30)

        const weekEarned = completedBookings
          .filter((b: any) => b.status === 'completed' && new Date(b.created_at) >= weekAgo)
          .reduce((acc: number, cur: any) => acc + (Number(cur.price) || 0), 0)

        const monthEarned = completedBookings
          .filter((b: any) => b.status === 'completed' && new Date(b.created_at) >= monthAgo)
          .reduce((acc: number, cur: any) => acc + (Number(cur.price) || 0), 0)

        setEarningsSummary({ week: weekEarned, month: monthEarned })
      }
    }

    loadStatsAndHistory()
  }, [userId, activeJobId, activeTab])

  // 4. Subscribing to Active Job state Changes
  useEffect(() => {
    if (!activeJobId) {
      setActiveJob(null)
      return
    }

    async function loadActiveJob() {
      const { data } = await supabase.from('bookings').select('*').eq('id', activeJobId).single()
      if (data) {
        setActiveJob(data)
        if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'expired') {
          setActiveJobId(null)
          setActiveJob(null)
        }
      }
    }
    loadActiveJob()

    const channel = supabase
      .channel('active_job_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${activeJobId}` },
        (payload) => {
          const updated = payload.new as any
          setActiveJob(updated)
          if (updated.status === 'completed' || updated.status === 'cancelled' || updated.status === 'expired') {
            setActiveJobId(null)
            setActiveJob(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeJobId])

  // 5. Setup Realtime subscription to incoming job_offers
  useEffect(() => {
    if (!userId || !isOnline || activeJobId) {
      setOffers([])
      setIncomingOffer(null)
      return
    }

    async function loadOffers() {
      const { data } = await supabase
        .from('job_offers')
        .select('*, bookings:job_request_id(*)')
        .eq('technician_id', userId)
        .eq('status', 'pending')

      if (data && data.length > 0) {
        setOffers(data)
        setIncomingOffer(data[0])
        setCountdown(20)
      } else {
        setIncomingOffer(null)
      }
    }
    loadOffers()

    const channel = supabase
      .channel('technician_job_offers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_offers', filter: `technician_id=eq.${userId}` },
        () => {
          loadOffers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, isOnline, activeJobId])

  // 6. Countdown modal timer
  useEffect(() => {
    if (!incomingOffer) return

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!)
          handleDeclineOffer()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [incomingOffer])

  const handleDeclineOffer = async () => {
    if (!incomingOffer) return
    await supabase.from('job_offers').update({ status: 'declined' }).eq('id', incomingOffer.id)
    setIncomingOffer(null)
  }

  const handleAcceptOffer = async () => {
    if (!incomingOffer || !userId) return

    // 1. Concurrency Check: Verify booking status is still 'pending' (client 'searching')
    const { data: booking } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', incomingOffer.job_request_id)
      .single()

    if (!booking || booking.status !== 'pending') {
      alert('This job has already been taken by another provider.')
      await handleDeclineOffer()
      return
    }

    // 2. Accept atomically (maps 'matched' to database 'confirmed')
    await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        technician_id: userId
      })
      .eq('id', incomingOffer.job_request_id)

    await supabase
      .from('job_offers')
      .update({ status: 'accepted' })
      .eq('id', incomingOffer.id)

    // Decline other offers for this request
    await supabase
      .from('job_offers')
      .update({ status: 'declined' })
      .eq('job_request_id', incomingOffer.job_request_id)
      .neq('id', incomingOffer.id)

    setActiveJobId(incomingOffer.job_request_id)
    setIncomingOffer(null)
  }

  const handleStatusChange = async (newStatus: 'en_route' | 'arrived' | 'in_progress' | 'completed') => {
    if (!activeJobId) return

    let dbStatus: any = newStatus
    if (newStatus === 'en_route' || newStatus === 'arrived') {
      dbStatus = 'confirmed'
    }

    const { error } = await supabase.from('bookings').update({ status: dbStatus }).eq('id', activeJobId)
    
    if (!error) {
      // Keep client-side state synchronized for rich UI navigation sequence
      setActiveJob((prev: any) => prev ? { ...prev, status: newStatus } : null)
      
      if (newStatus === 'completed') {
        alert('Job completed successfully! Cash collected.')
        setActiveJobId(null)
        setActiveJob(null)
      }
    }
  }

  // Save Settings
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSavingSettings(true)

    // Save mocks to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('ustad_mock_gps', String(mockGps))
      localStorage.setItem('ustad_mock_lat', String(mockLat))
      localStorage.setItem('ustad_mock_lng', String(mockLng))
    }

    const { error } = await supabase.from('technician_details').upsert({
      profile_id: userId,
      specialty: specialty,
      bio: bio,
      years_experience: experience,
      service_categories: categories,
      service_radius_km: radius,
    })

    setSavingSettings(false)
    if (!error) {
      alert('Settings saved successfully!')
    } else {
      alert('Failed to save settings: ' + error.message)
    }
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      if (geoWatchId !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchId)
      }
      
      if (userId) {
        await supabase.from('technician_status').upsert({
          technician_id: userId,
          is_online: false,
          last_ping_at: new Date().toISOString(),
        })
      }

      await supabase.auth.signOut()
      localStorage.clear()
      router.push('/login')
    }
  }

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  return (
    <div className="min-h-svh bg-background pb-20">
      <AppTopbar />

      <main className="mx-auto w-full max-w-xl px-4 py-5 flex flex-col gap-4">
        {activeTab === 'dashboard' && (
          <>
            {/* Online/Offline Status Header */}
            {!activeJobId ? (
              <div className="flex flex-col gap-4 flex-1">
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
                        {isOnline ? "Visible to nearby clients for job dispatches." : "Toggle switch to watch device location."}
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

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="soft-shadow border-border bg-card">
                    <CardContent className="p-4 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Earnings Today</span>
                      <span className="text-xl font-bold text-foreground">Rs. {earningsToday}</span>
                    </CardContent>
                  </Card>
                  <Card className="soft-shadow border-border bg-card">
                    <CardContent className="p-4 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Jobs Completed</span>
                      <span className="text-xl font-bold text-foreground">{completedToday}</span>
                    </CardContent>
                  </Card>
                </div>

                {isOnline ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center gap-4">
                    <span className="relative flex size-10 items-center justify-center">
                      <span className="absolute inline-flex inset-0 rounded-full bg-success/30 animate-ping" />
                      <span className="relative inline-flex size-6 rounded-full bg-success soft-shadow" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Visible to nearby customers</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        GPS watch position is active
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-4 bg-muted/20 border border-border/60 rounded-3xl">
                    <Shield className="size-10 text-muted-foreground/60" />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Offline</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mt-1 leading-normal">
                        Go online above to request location tracking permission and begin receiving instant dispatches.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Active Job Dispatch Panel */
              <div className="flex flex-col gap-4 flex-1">
                {/* Route navigation Map */}
                <div className="relative h-60 w-full rounded-2xl overflow-hidden border border-border">
                  <MapPlaceholder
                    className="h-full border-0"
                    pins={[
                      { top: '50%', left: '50%', active: true },
                      { top: '40%', left: '40%' }
                    ]}
                  />
                  <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                      <Navigation className="size-3.5 animate-pulse" />
                      Navigation Active
                    </span>
                  </div>
                </div>

                {/* Dispatch Details Header */}
                <div className="flex flex-col gap-1 px-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Dispatch route status
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-[#EAF1FE] px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                      {activeJob?.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground mt-1">
                    {activeJob?.status === 'matched' && "Customer accepted dispatch request"}
                    {activeJob?.status === 'en_route' && "En route to client location"}
                    {activeJob?.status === 'arrived' && "You have arrived"}
                    {activeJob?.status === 'in_progress' && "Performing service"}
                  </h2>
                </div>

                {/* Address Card */}
                <Card className="soft-shadow border-border bg-muted/20">
                  <CardContent className="p-4 flex flex-col gap-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-bold text-foreground capitalize">{activeJob?.service_category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Description</span>
                      <span className="font-semibold text-foreground">{activeJob?.description || 'No notes'}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/40 pt-2.5">
                      <span className="text-muted-foreground">Client Address</span>
                      <span className="font-bold text-foreground">{activeJob?.address || activeJob?.location || 'F-7, Islamabad'}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/40 pt-2.5">
                      <span className="text-muted-foreground">Collectable Fee</span>
                      <span className="font-bold text-foreground text-sm">Rs. {activeJob?.price || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Step Actions */}
                <div className="flex flex-col gap-2 mt-2">
                  {activeJob?.status === 'matched' && (
                    <Button
                      size="lg"
                      className="tap h-12 w-full bg-primary hover:bg-primary/95 text-white"
                      onClick={() => handleStatusChange('en_route')}
                    >
                      Start Navigating
                    </Button>
                  )}

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

                  {/* External navigation links */}
                  {activeJob && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeJob.lat},${activeJob.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted/50 transition-colors"
                    >
                      <ExternalLink className="size-4" />
                      Open in Google Maps Navigation
                    </a>
                  )}

                  {/* Contact client links */}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button 
                      variant="outline" 
                      className="tap justify-center bg-transparent h-11" 
                      render={<a href={`tel:+923001234567`} />}
                    >
                      <Phone className="size-4 mr-2" />
                      Call Customer
                    </Button>
                    <Button 
                      variant="outline" 
                      className="tap justify-center bg-transparent h-11"
                      onClick={() => router.push(`/chat/${activeJobId}`)}
                    >
                      <MessageSquare className="size-4 mr-2" />
                      Chat Customer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Chat History Messages list tab */}
        {activeTab === 'messages' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-foreground">Client Conversations</h2>
            <div className="flex flex-col gap-2">
              {chatThreads.length > 0 ? (
                chatThreads.map((thread) => (
                  <Card
                    key={thread.id}
                    onClick={() => router.push(`/chat/${thread.id}`)}
                    className="border border-border hover:border-primary/20 transition-all cursor-pointer relative"
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                        <MessageSquare className="size-4.5" />
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col gap-1 pr-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-foreground truncate">{thread.partnerName}</span>
                          <span className="text-[10px] text-muted-foreground">{thread.timestamp}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground capitalize font-medium">{thread.category} Service • Status: {thread.status}</p>
                        <p className={cn("text-xs truncate mt-1", thread.unread ? "font-bold text-foreground" : "text-muted-foreground/80")}>
                          {thread.latestText}
                        </p>
                        {thread.unread && (
                          <span className="absolute right-4 bottom-5 size-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 absolute end-3 top-1/2 -translate-y-1/2" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No active client conversations.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Job History tab */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-foreground">Completed Job Logs</h2>
            
            {/* Summary details */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border border-border p-4 flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground font-semibold">Total This Week</span>
                <span className="text-lg font-bold text-foreground">Rs. {earningsSummary.week}</span>
              </Card>
              <Card className="border border-border p-4 flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground font-semibold">Total This Month</span>
                <span className="text-lg font-bold text-foreground">Rs. {earningsSummary.month}</span>
              </Card>
            </div>

            {/* List */}
            <div className="flex flex-col gap-2 mt-2">
              {historyJobs.length > 0 ? (
                historyJobs.map((job) => (
                  <Card key={job.id} className="border border-border shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-foreground capitalize">{job.category} Service</span>
                        <span className="text-[10px] text-muted-foreground">{job.date} • Code {job.id.substring(0, 5).toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">Rs. {job.price}</span>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No completed jobs logged yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile & Settings Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={saveSettings} className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-foreground">Partner Settings</h2>

            {/* Specialty fields */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="specialty" className="text-xs font-semibold text-foreground">Specialty Title</label>
              <input
                id="specialty"
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Master Plumber"
                className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-xs outline-none focus:border-primary focus:bg-background text-foreground"
              />
            </div>

            {/* Experience fields */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="experience" className="text-xs font-semibold text-foreground">Years of Experience</label>
              <input
                id="experience"
                type="number"
                value={experience}
                onChange={(e) => setExperience(Number(e.target.value))}
                min={1}
                className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-xs outline-none focus:border-primary focus:bg-background text-foreground"
              />
            </div>

            {/* Bio fields */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bio" className="text-xs font-semibold text-foreground">Bio Description</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Write a brief intro..."
                className="w-full rounded-xl border border-border bg-muted p-3 text-xs outline-none focus:border-primary focus:bg-background text-foreground resize-none"
              />
            </div>

            {/* Categories checklist */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-foreground">Services Offered</span>
              <div className="grid grid-cols-2 gap-2">
                {['plumbing', 'electrical', 'carpenter', 'ac-repair', 'appliance-repair'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors justify-start",
                      categories.includes(cat) ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-muted"
                    )}
                  >
                    <span className={cn("size-2 rounded-full", categories.includes(cat) ? "bg-primary" : "bg-muted-foreground/40")} />
                    <span className="capitalize">{cat.replace('-', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Service radius slider */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Service Dispatch Radius</span>
                <span className="text-primary font-mono">{radius} km</span>
              </div>
              <input
                type="range"
                min={2}
                max={40}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* GPS Simulator Location Mock Settings */}
            <div className="flex flex-col gap-3.5 border-t border-border pt-4 mt-2">
              <div className="flex items-center gap-2">
                <input
                  id="mockGps"
                  type="checkbox"
                  checked={mockGps}
                  onChange={(e) => setMockGps(e.target.checked)}
                  className="rounded border-border accent-primary cursor-pointer size-4"
                />
                <label htmlFor="mockGps" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Mock GPS Location (For Testing/Demo)
                </label>
              </div>

              {mockGps && (
                <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="mockLat" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Latitude</label>
                    <input
                      id="mockLat"
                      type="number"
                      step="0.0001"
                      value={mockLat}
                      onChange={(e) => setMockLat(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-xs outline-none focus:border-primary focus:bg-background text-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="mockLng" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Longitude</label>
                    <input
                      id="mockLng"
                      type="number"
                      step="0.0001"
                      value={mockLng}
                      onChange={(e) => setMockLng(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-xs outline-none focus:border-primary focus:bg-background text-foreground"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={savingSettings}
              className="tap h-12 w-full mt-4"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="tap h-12 w-full mt-2.5 border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive font-semibold bg-transparent"
              onClick={handleLogout}
            >
              Logout Account
            </Button>
          </form>
        )}
      </main>

      {/* Incoming job offers countdown overlay */}
      {incomingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden soft-shadow animate-in fade-in zoom-in duration-200">
            <CardHeader className="bg-primary/5 border-b border-border/40 p-4">
              <CardTitle className="text-base flex items-center gap-2 text-primary font-bold">
                <Wrench className="size-5" />
                Incoming Job Dispatch!
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col items-center gap-4 text-center">
              {/* Ring countdown */}
              <div className="relative flex size-20 items-center justify-center">
                <svg className="absolute inset-0 size-full -rotate-90">
                  <circle cx="40" cy="40" r="34" className="stroke-muted fill-none" strokeWidth="4" />
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

              {/* Offer Info */}
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-foreground capitalize">
                  {incomingOffer.bookings?.service_category} Request
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center mt-1">
                  <MapPin className="size-3.5 text-primary" />
                  Location: {incomingOffer.bookings?.address || incomingOffer.bookings?.location || 'F-7, Islamabad'}
                </p>
                <p className="text-xs text-primary font-bold mt-1.5 uppercase tracking-wider">
                  Guaranteed Fee: Rs. {incomingOffer.bookings?.price || 0}
                </p>
              </div>

              <div className="border-t border-border/40 w-full my-1" />

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 w-full mt-1.5">
                <Button
                  variant="outline"
                  size="lg"
                  className="tap h-12 w-full bg-transparent font-semibold border-border hover:bg-muted text-foreground"
                  onClick={handleDeclineOffer}
                >
                  Decline
                </Button>
                <Button
                  size="lg"
                  className="tap h-12 w-full bg-primary font-bold text-white shadow-lg hover:bg-primary/95"
                  onClick={handleAcceptOffer}
                >
                  Accept Job
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <div className="fixed bottom-0 inset-x-0 h-16 bg-card border-t border-border flex items-center justify-around z-40 soft-shadow">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors",
            activeTab === 'dashboard' ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Wrench className="size-5" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors",
            activeTab === 'messages' ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="size-5" />
          Messages
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors",
            activeTab === 'history' ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock className="size-5" />
          Job Logs
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors",
            activeTab === 'profile' ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="size-5" />
          Profile
        </button>
      </div>
    </div>
  )
}
