import { type JobStatusKey } from './data'

export type TechnicianStatus = {
  technician_id: string
  is_online: boolean
  current_lat: number
  current_lng: number
  last_ping_at: number // timestamp
  active_job_id: string | null
}

export type JobRequest = {
  id: string
  customer_id: string
  service_category: string
  lat: number
  lng: number
  address: string
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

export function getDbTable<T>(tableName: string): T[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEY_PREFIX + tableName)
  return data ? JSON.parse(data) : []
}

export function saveDbTable<T>(tableName: string, rows: T[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_PREFIX + tableName, JSON.stringify(rows))
  // Dispatch custom event for single-tab sync
  window.dispatchEvent(new CustomEvent('local-database-update', { detail: { tableName } }))
}

export function updateDbRow<T extends { id?: string; technician_id?: string }>(
  tableName: string,
  keyField: keyof T,
  keyValue: string,
  updates: Partial<T>
) {
  const rows = getDbTable<T>(tableName)
  const index = rows.findIndex((r) => r[keyField] === (keyValue as any))
  if (index !== -1) {
    rows[index] = { ...rows[index], ...updates }
    saveDbTable(tableName, rows)
  }
}

export function insertDbRow<T>(tableName: string, newRow: T) {
  const rows = getDbTable<T>(tableName)
  rows.push(newRow)
  saveDbTable(tableName, rows)
}

export function subscribeToDbTable(tableName: string, callback: () => void) {
  if (typeof window === 'undefined') return () => {}

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

  return () => {
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener('local-database-update', handleCustomEvent)
  }
}

// Broadcast coordinates for live smooth map movement (instead of heavy polling)
export function broadcastLiveLocation(jobRequestId: string, lat: number, lng: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${STORAGE_KEY_PREFIX}broadcast_${jobRequestId}`, JSON.stringify({ lat, lng, timestamp: Date.now() }))
  window.dispatchEvent(new CustomEvent('live-location-broadcast', { detail: { jobRequestId, lat, lng } }))
}

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

  return () => {
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener('live-location-broadcast', handleCustomEvent)
  }
}
