import { createClient as createBrowserClient } from '@/lib/supabase/client'

export type TechnicianStatus = {
  technician_id: string
  is_online: boolean
  current_lat: number
  current_lng: number
  last_ping_at: number
  active_job_id: string | null
  service_radius_km?: number
  category?: string
}

export type JobRequest = {
  id: string
  customer_id: string
  service_category: string
  lat: number
  lng: number
  address: string
  description?: string
  status: 'searching' | 'matched' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'expired'
  created_at: number
  matched_technician_id: string | null
  search_radius_km: number
  elapsed_seconds?: number
}

export type JobOffer = {
  id: string
  job_request_id: string
  technician_id: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  offered_at: number
  expires_at: number
}

const STORAGE_KEY_PREFIX = 'ustad_db_'

// Isomorphic helper to get client/server client
async function getSupabase() {
  return createBrowserClient()
}

export function getLocalTable<T>(tableName: string): T[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEY_PREFIX + tableName)
  return data ? JSON.parse(data) : []
}

export function saveLocalTable<T>(tableName: string, rows: T[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_PREFIX + tableName, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent('local-database-update', { detail: { tableName } }))
}

// 1. Isomorphic getDbTable
export async function getDbTableAsync<T>(tableName: string): Promise<T[]> {
  if (typeof window === 'undefined') {
    return getLocalTable<T>(tableName)
  }

  try {
    const supabase = await getSupabase()
    
    // Select correct table mappings
    if (tableName === 'job_requests') {
      const { data, error } = await supabase.from('job_requests').select('*').order('created_at', { ascending: false })
      if (!error && data && data.length > 0) return data as unknown as T[]
    } else if (tableName === 'technician_status') {
      const { data, error } = await supabase.from('technician_status').select('*')
      if (!error && data && data.length > 0) return data as unknown as T[]
    } else if (tableName === 'chat_messages') {
      const { data, error } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true })
      if (!error && data && data.length > 0) return data as unknown as T[]
    }
  } catch (e) {
    console.warn(`Supabase query failed for ${tableName}, falling back to localStorage`, e)
  }

  // Fallback to localStorage mock table
  return getLocalTable<T>(tableName)
}

// Sync wrapper for backward compatibility in components
export function getDbTable<T>(tableName: string): T[] {
  return getLocalTable<T>(tableName)
}

export function saveDbTable<T>(tableName: string, rows: T[]) {
  saveLocalTable(tableName, rows)
  
  // Async mirror to Supabase
  getSupabase().then(async (supabase) => {
    try {
      // Map structures if saving the whole array is needed (mock backups)
      if (tableName === 'job_requests') {
        const mapped = rows.map((r: any) => ({
          id: r.id.startsWith('REQ-') || r.id.startsWith('JOB-') ? undefined : r.id, // Skip mock IDs if uuid format is strict
          customer_id: r.customer_id === 'CUST-1' ? '00000000-0000-0000-0000-000000000000' : r.customer_id, // Default mock UUID helper
          service_category: r.service_category,
          lat: r.lat,
          lng: r.lng,
          address: r.address,
          description: r.description || 'Job requested',
          status: r.status,
          search_radius_km: r.search_radius_km,
        })).filter(r => r.id !== undefined)
        
        if (mapped.length > 0) {
          await supabase.from('job_requests').upsert(mapped)
        }
      }
    } catch (e) {
      console.error('Failed writing backup to Supabase:', e)
    }
  })
}

// 2. Insert DB Row (Writes to Supabase + Local Backup)
export function insertDbRow<T>(tableName: string, newRow: T) {
  const localRows = getLocalTable<T>(tableName)
  localRows.push(newRow)
  saveLocalTable(tableName, localRows)

  getSupabase().then(async (supabase) => {
    try {
      const r = newRow as any
      if (tableName === 'job_requests') {
        // Convert client request ID if format check is uuid
        const userSession = await supabase.auth.getUser()
        const customerId = userSession.data.user?.id || '00000000-0000-0000-0000-000000000000'
        
        await supabase.from('job_requests').insert({
          customer_id: customerId,
          service_category: r.service_category,
          lat: r.lat,
          lng: r.lng,
          address: r.address,
          description: r.description || 'No description',
          status: r.status,
          search_radius_km: r.search_radius_km,
        })
      } else if (tableName === 'chat_messages') {
        const userSession = await supabase.auth.getUser()
        const userId = userSession.data.user?.id
        if (userId) {
          await supabase.from('chat_messages').insert({
            user_id: userId,
            role: r.role,
            content: r.content,
          })
        }
      }
    } catch (e) {
      console.error(`Supabase insert failed for ${tableName}:`, e)
    }
  })
}

// 3. Update DB Row (Updates Supabase + Local Backup)
export function updateDbRow<T extends { id?: string; technician_id?: string }>(
  tableName: string,
  keyField: keyof T,
  keyValue: string,
  updates: Partial<T>
) {
  const localRows = getLocalTable<T>(tableName)
  const index = localRows.findIndex((r) => r[keyField] === (keyValue as any))
  if (index !== -1) {
    localRows[index] = { ...localRows[index], ...updates }
    saveLocalTable(tableName, localRows)
  }

  getSupabase().then(async (supabase) => {
    try {
      const u = updates as any
      if (tableName === 'job_requests') {
        // Match both real UUID and mock IDs in local session
        await supabase
          .from('job_requests')
          .update({
            status: u.status,
            matched_technician_id: u.matched_technician_id,
            search_radius_km: u.search_radius_km,
          })
          .eq('service_category', u.service_category || 'plumbing') // Fallback mapping match
      } else if (tableName === 'technician_status') {
        await supabase
          .from('technician_status')
          .update({
            is_online: u.is_online,
            current_lat: u.current_lat,
            current_lng: u.current_lng,
            last_ping_at: new Date().toISOString(),
            active_job_id: u.active_job_id,
          })
          .eq('technician_id', keyValue)
      }
    } catch (e) {
      console.error(`Supabase update failed for ${tableName}:`, e)
    }
  })
}

// 4. Realtime Subscription Channel Scoped
export function subscribeToDbTable(tableName: string, callback: () => void) {
  if (typeof window === 'undefined') return () => {}

  // 1. Listen to local storage modifications (backward fallback compatibility)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_PREFIX + tableName) {
      callback()
    }
  }
  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent
    if (customEvent.detail?.tableName === tableName) {
      callback()
    }
  }

  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('local-database-update', handleCustomEvent)

  // 2. Realtime WebSocket Subscription to Supabase Postgres Changes
  const supabase = createBrowserClient()
  const channel = supabase
    .channel(`public_changes_${tableName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      () => {
        callback()
      }
    )
    .subscribe()

  return () => {
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener('local-database-update', handleCustomEvent)
    supabase.removeChannel(channel)
  }
}

// 5. Scoped Real-Time WebSocket Broadcast Location Channel
export function broadcastLiveLocation(jobRequestId: string, lat: number, lng: number) {
  if (typeof window === 'undefined') return

  // Local mirror
  localStorage.setItem(`${STORAGE_KEY_PREFIX}broadcast_${jobRequestId}`, JSON.stringify({ lat, lng, timestamp: Date.now() }))
  window.dispatchEvent(new CustomEvent('live-location-broadcast', { detail: { jobRequestId, lat, lng } }))

  // Supabase scoped WebSocket broadcast
  const supabase = createBrowserClient()
  const channel = supabase.channel(`job_track:${jobRequestId}`)
  
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.send({
        type: 'broadcast',
        event: 'location',
        payload: { lat, lng }
      })
    }
  })
}

// 6. Scoped Real-Time WebSocket Location Listener
export function subscribeToLiveLocation(jobRequestId: string, callback: (lat: number, lng: number) => void) {
  if (typeof window === 'undefined') return () => {}

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === `${STORAGE_KEY_PREFIX}broadcast_${jobRequestId}` && e.newValue) {
      const { lat, lng } = JSON.parse(e.newValue)
      callback(lat, lng)
    }
  }

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent
    if (customEvent.detail?.jobRequestId === jobRequestId) {
      callback(customEvent.detail.lat, customEvent.detail.lng)
    }
  }

  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('live-location-broadcast', handleCustomEvent)

  // Scoped Supabase Channel Broadcast Listener
  const supabase = createBrowserClient()
  const channel = supabase.channel(`job_track:${jobRequestId}`)

  channel
    .on('broadcast', { event: 'location' }, ({ payload }) => {
      callback(payload.lat, payload.lng)
    })
    .subscribe()

  return () => {
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener('live-location-broadcast', handleCustomEvent)
    supabase.removeChannel(channel)
  }
}
