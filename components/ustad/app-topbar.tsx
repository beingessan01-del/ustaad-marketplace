'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, ChevronDown, MapPin, Navigation, Check, X } from 'lucide-react'
import { Logo } from './logo'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getSectorFromCoords, cleanLocationName } from '@/lib/data'

const SECTOR_PRESETS = [
  'H-12, Islamabad',
  'F-7, Islamabad',
  'F-8, Islamabad',
  'Blue Area, Islamabad',
  'G-9, Islamabad',
  'G-11, Islamabad',
  'E-7, Islamabad',
  'I-9, Islamabad',
  'Saddar, Rawalpindi',
  'Commercial Market, Rawalpindi',
  'Bahria Town, Rawalpindi',
]

export function AppTopbar({ area = 'F-7, Islamabad' }: { area?: string }) {
  const [currentArea, setCurrentArea] = useState(cleanLocationName(area))
  const [isOpen, setIsOpen] = useState(false)
  const [customArea, setCustomArea] = useState('')
  const [detectingGps, setDetectingGps] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ustad_user_area')
      if (saved) {
        setCurrentArea(cleanLocationName(saved))
      }
    }

    const handleLocationChange = (e: Event) => {
      const customEvt = e as CustomEvent<string>
      if (customEvt.detail) {
        setCurrentArea(cleanLocationName(customEvt.detail))
      }
    }

    window.addEventListener('ustad-location-changed', handleLocationChange)
    return () => {
      window.removeEventListener('ustad-location-changed', handleLocationChange)
    }
  }, [])

  const selectArea = (newArea: string) => {
    const cleaned = cleanLocationName(newArea)
    setCurrentArea(cleaned)
    if (typeof window !== 'undefined') {
      localStorage.setItem('ustad_user_area', cleaned)
      window.dispatchEvent(new CustomEvent('ustad-location-changed', { detail: cleaned }))
    }
    setIsOpen(false)
  }

  const handleGpsDetect = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setDetectingGps(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDetectingGps(false)
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const detectedSector = getSectorFromCoords(lat, lng)

          localStorage.setItem('ustad_customer_lat', String(lat))
          localStorage.setItem('ustad_customer_lng', String(lng))
          localStorage.setItem('ustad_detected_sector', detectedSector)

          selectArea(detectedSector)
        },
        (err) => {
          setDetectingGps(false)
          console.warn('GPS location error:', err)
          alert('Could not detect GPS location. Please select a sector below.')
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    } else {
      alert('Geolocation is not supported by your browser.')
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="tap flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 hover:bg-muted/80 transition-colors"
          >
            <MapPin className="size-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground truncate max-w-[180px] sm:max-w-[260px]">
              {currentArea}
            </span>
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          </button>

          <div className="flex items-center gap-1">
            <Link
              href="/jobs/JOB-2481"
              className="tap flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Notifications"
            >
              <span className="relative">
                <Bell className="size-5" />
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-background bg-primary" />
              </span>
            </Link>
            <Logo href="/home" className="ml-1 hidden text-base sm:inline-flex" />
          </div>
        </div>
      </header>

      {/* Location Selector Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              Select Your Location
            </DialogTitle>
            <DialogDescription>
              Choose your sector or detect GPS location to match nearby technicians.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* GPS Detection Button */}
            <Button
              type="button"
              variant="outline"
              className="tap flex h-11 w-full items-center justify-center gap-2 rounded-xl border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 font-semibold text-xs"
              disabled={detectingGps}
              onClick={handleGpsDetect}
            >
              <Navigation className={`size-4 ${detectingGps ? 'animate-spin' : ''}`} />
              {detectingGps ? 'Detecting GPS Location...' : 'Use Current GPS Location'}
            </Button>

            {/* Custom Location Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (customArea.trim()) {
                  selectArea(customArea.trim())
                  setCustomArea('')
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Or enter custom area (e.g. F-10/2)"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                className="h-10 flex-1 rounded-xl border border-border bg-muted px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-background"
              />
              <Button type="submit" size="sm" disabled={!customArea.trim()}>
                Save
              </Button>
            </form>

            {/* Sector Presets */}
            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Popular Sectors
              </span>
              <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {SECTOR_PRESETS.map((sector) => {
                  const isSelected = currentArea === sector
                  return (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => selectArea(sector)}
                      className={`tap flex items-center justify-between rounded-xl px-3 py-2.5 text-xs text-left transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'bg-muted/50 hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className="size-3.5 shrink-0 opacity-70" />
                        {sector}
                      </span>
                      {isSelected && <Check className="size-4 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

