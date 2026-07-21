'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Search, AlertCircle, Sparkles, Navigation, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomerLayout } from '@/components/ustad/customer-layout'
import { AppTopbar } from '@/components/ustad/app-topbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/lib/i18n'
import {
  serviceCategories,
  technicians,
  formatPKR,
  type Technician,
} from '@/lib/data'
import {
  getDbTable,
  getDbTableAsync,
  saveDbTable,
  type TechnicianStatus,
} from '@/lib/storage-sync'
import { StarRating } from '@/components/ustad/star-rating'
import { AvailabilityBadge } from '@/components/ustad/availability-badge'

function MapPageContent() {
  const router = useRouter()
  const { t, isRtl } = useTranslation()

  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [panning, setPanning] = useState(false)
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null)
  const [onlineTechs, setOnlineTechs] = useState<Technician[]>([])
  const [onlineStatuses, setOnlineStatuses] = useState<TechnicianStatus[]>([])



  // Populate technician statuses, fetching from Supabase first
  useEffect(() => {
    const loadOnlineTechs = async () => {
      let activeTechnicians = [...technicians]
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'provider')
        if (data && data.length > 0) {
          activeTechnicians = data.map((profile: any, idx: number) => {
            const mock = technicians[idx % technicians.length]
            const nameToUse = profile.full_name || mock.name
            return {
              ...mock,
              id: profile.id,
              name: nameToUse,
              initials: nameToUse.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
              specialty: mock.specialty,
              category: mock.category,
            }
          })
        }
      } catch (e) {
        console.warn('Failed to load technician profiles on map:', e)
      }

      const statuses = await getDbTableAsync<TechnicianStatus>('technician_status')

      if (statuses.length === 0) {
        const initialStatuses = activeTechnicians.map((t) => ({
          technician_id: t.id,
          is_online: t.status === 'available',
          current_lat: 33.7294,
          current_lng: 73.0561,
          last_ping_at: Date.now(),
          active_job_id: null,
        }))
        saveDbTable('technician_status', initialStatuses)
        const onlineIds = initialStatuses.filter(s => s.is_online).map(s => s.technician_id)
        const matched = activeTechnicians.filter((t) => onlineIds.includes(t.id) || t.status === 'available')
        setOnlineTechs(matched)
        setOnlineStatuses(initialStatuses as any)
      } else {
        const onlineIds = statuses.filter((s) => s.is_online).map((s) => s.technician_id)
        const matched = activeTechnicians.filter((t) => onlineIds.includes(t.id) || t.status === 'available')
        setOnlineTechs(matched)
        setOnlineStatuses(statuses)
      }
      setLoading(false)
    }

    const timer = setTimeout(loadOnlineTechs, 600)
    return () => clearTimeout(timer)
  }, [])

  const filteredTechs = onlineTechs.filter((t) => {
    if (selectedCategory === 'all') return true
    return t.category === selectedCategory
  })

  const techLocations: Record<string, { lat: number; lng: number }> = {
    'usman-khan': { lat: 33.7315, lng: 73.0512 },
    'adnan-raza': { lat: 33.7251, lng: 73.0615 },
    'faisal-mehmood': { lat: 33.7362, lng: 73.0645 },
    'zeeshan-ali': { lat: 33.7231, lng: 73.0485 },
    'kamran-shah': { lat: 33.7345, lng: 73.0558 },
    'naveed-akhtar': { lat: 33.7198, lng: 73.0578 },
  }

  const postTechnicians = () => {
    const iframe = document.getElementById('map-iframe') as HTMLIFrameElement
    if (iframe && iframe.contentWindow) {
      const list = filteredTechs.map((t) => {
        const status = onlineStatuses.find((s) => s.technician_id === t.id)
        const lat = status?.current_lat || techLocations[t.id]?.lat || (33.7294 + (Math.random() - 0.5) * 0.015)
        const lng = status?.current_lng || techLocations[t.id]?.lng || (73.0561 + (Math.random() - 0.5) * 0.015)
        return {
          id: t.id,
          name: t.name,
          initials: t.initials,
          category: t.category,
          lat,
          lng,
        }
      })
      iframe.contentWindow.postMessage(
        {
          type: 'UPDATE_TECHNICIANS',
          technicians: list,
        },
        '*'
      )
    }
  }

  const handleLocateMe = () => {
    const iframe = document.getElementById('map-iframe') as HTMLIFrameElement
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'LOCATE_ME' }, '*')
    }
  }

  useEffect(() => {
    postTechnicians()
  }, [filteredTechs, onlineStatuses])

  useEffect(() => {
    const handleMapMessage = (e: MessageEvent) => {
      const data = e.data
      if (!data) return

      if (data.type === 'SELECT_TECHNICIAN') {
        const tech = onlineTechs.find((t) => t.id === data.technicianId)
        if (tech) {
          setSelectedTech(tech)
        }
      } else if (data.type === 'USER_LOCATION') {
        localStorage.setItem('ustad_customer_lat', String(data.lat))
        localStorage.setItem('ustad_customer_lng', String(data.lng))
      }
    }

    window.addEventListener('message', handleMapMessage)
    return () => window.removeEventListener('message', handleMapMessage)
  }, [onlineTechs])

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #f5f6f8;
    }
    .user-pulse-icon {
      position: relative;
    }
    .user-pulse-icon::after {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
      background-color: #2F6FED;
      border-radius: 50%;
      border: 2.5px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.25);
      top: -7px;
      left: -7px;
    }
    .user-pulse-icon::before {
      content: '';
      position: absolute;
      width: 22px;
      height: 22px;
      background-color: rgba(47, 111, 237, 0.4);
      border-radius: 50%;
      top: -11px;
      left: -11px;
      animation: pulse 1.8s infinite ease-in-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    
    .tech-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      width: 32px;
      height: 32px;
    }
    .tech-pin-circle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.2);
      color: white;
    }
    .tech-label {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      background-color: #1A1D1F;
      color: white;
      font-size: 8px;
      font-weight: 700;
      padding: 1.5px 3.5px;
      border-radius: 4px;
      white-space: nowrap;
      margin-top: 3px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.15);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var defaultLat = 33.7294;
    var defaultLng = 73.0561;
    
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultLat, defaultLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var userMarker = null;

    function updateUserLocation(lat, lng) {
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        var userIcon = L.divIcon({
          className: 'user-pulse-icon',
          iconSize: [0, 0]
        });
        userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
      }
      map.setView([lat, lng], 14);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          var realLat = position.coords.latitude;
          var realLng = position.coords.longitude;
          updateUserLocation(realLat, realLng);
          window.parent.postMessage({ type: 'USER_LOCATION', lat: realLat, lng: realLng }, '*');
        },
        function(error) {
          console.warn('Geolocation failed, centering on default:', error);
          updateUserLocation(defaultLat, defaultLng);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      updateUserLocation(defaultLat, defaultLng);
    }

    var colorClasses = {
      plumbing: '#2F6FED',
      electrical: '#E0A100',
      mechanic: '#5B5BD6',
      painting: '#9C27B0',
      cleaning: '#10B981',
      carpentry: '#F5A623'
    };

    var mapPinSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

    var techMarkersGroup = L.layerGroup().addTo(map);

    window.addEventListener('message', function(event) {
      var message = event.data;
      if (message.type === 'UPDATE_TECHNICIANS') {
        techMarkersGroup.clearLayers();
        var techs = message.technicians;
        
        techs.forEach(function(tech) {
          var lat = tech.lat;
          var lng = tech.lng;
          var category = tech.category;
          var color = colorClasses[category] || '#2F6FED';
          
          var techIcon = L.divIcon({
            className: '',
            html: '<div class="tech-marker">' +
                  '  <div class="tech-pin-circle" style="background-color: ' + color + ';">' + mapPinSvg + '</div>' +
                  '  <span class="tech-label">' + tech.initials + '</span>' +
                  '</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          });

          var marker = L.marker([lat, lng], { icon: techIcon });
          marker.on('click', function() {
            window.parent.postMessage({ type: 'SELECT_TECHNICIAN', technicianId: tech.id }, '*');
          });
          marker.addTo(techMarkersGroup);
        });
      } else if (message.type === 'LOCATE_ME') {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function(position) {
              var realLat = position.coords.latitude;
              var realLng = position.coords.longitude;
              updateUserLocation(realLat, realLng);
              if (userMarker) {
                userMarker.bindPopup("<b>You are here!</b>").openPopup();
              }
              map.setView([realLat, realLng], 15);
            },
            function(error) {
              console.warn('Geolocation failed:', error);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }
      }
    });
  </script>
</body>
</html>
  `



  // Simulated Pan map trigger
  const handleSimulatePan = () => {
    setPanning(true)
    setSelectedTech(null)
    setTimeout(() => {
      setPanning(false)
    }, 500)
  }

  const handleRequestTechNow = (tech: Technician) => {
    // Check if still online
    const currentStatuses = getDbTable<TechnicianStatus>('technician_status')
    const statusRow = currentStatuses.find((s) => s.technician_id === tech.id)

    // Route to targeted dispatch flow
    router.push(`/booking/instant?category=${tech.category}&techId=${tech.id}`)
  }

  return (
    <CustomerLayout>
      <div className="min-h-dvh flex flex-col bg-background">
        <AppTopbar />

        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Header Horizontal Filter Chips */}
          <div className="border-b border-border bg-card/85 backdrop-blur-xs py-3 px-4 z-10 sticky top-0 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-bold tracking-tight text-foreground">
                {t('map.browsable_map_title')}
              </h1>
              <button
                onClick={handleSimulatePan}
                className="text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-0.5 rounded font-bold uppercase transition-colors"
              >
                Simulate Pan Map
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
              <button
                onClick={() => {
                  setSelectedCategory('all')
                  setSelectedTech(null)
                }}
                className={cn(
                  "tap rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap border transition-all",
                  selectedCategory === 'all'
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-[#6F767E] hover:bg-muted hover:text-foreground"
                )}
              >
                {t('map.filter_all')}
              </button>
              {serviceCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCategory(c.id)
                    setSelectedTech(null)
                  }}
                  className={cn(
                    "tap rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap border transition-all",
                    selectedCategory === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-[#6F767E] hover:bg-muted hover:text-foreground"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Standalone Map viewport */}
          <div className="flex-1 min-h-[400px] relative bg-[#F5F6F8]">
            {loading || panning ? (
              // Shared Loading skeletons tinted to #F5F6F8 matching card shape
              <div className="absolute inset-0 z-20 bg-background/70 backdrop-blur-xs p-4 flex flex-col gap-4 justify-center items-center">
                <div className="w-full max-w-sm flex flex-col gap-3">
                  <Skeleton className="h-10 w-2/3 mx-auto" />
                  <Skeleton className="h-40 w-full rounded-2xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </div>
            ) : null}

            {/* Live Leaflet Map Grid */}
            <div className="map-grid relative w-full h-full min-h-[480px] overflow-hidden rounded-2xl">
              <iframe
                id="map-iframe"
                srcDoc={mapHtml}
                onLoad={postTechnicians}
                className="absolute inset-0 w-full h-full border-0 opacity-90"
              />

              {/* Floating Locate Me Action Button */}
              <button
                onClick={handleLocateMe}
                className="absolute bottom-24 right-4 z-20 tap flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg hover:bg-muted active:scale-95 transition-all"
                title="Locate Me"
              >
                <Navigation className="size-5 fill-primary text-primary" />
              </button>

              {/* Empty state alert overlay */}
              {!loading && !panning && filteredTechs.length === 0 && (
                <div className="absolute inset-x-4 top-1/3 z-20 flex justify-center">
                  <div className="bg-card border border-border rounded-2xl p-5 max-w-xs soft-shadow flex flex-col gap-3 items-center text-center">
                    <AlertCircle className="size-8 text-muted-foreground/60" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{t('map.no_technicians_online')}</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-normal">
                        Try clearing category filters or check another neighborhood in Islamabad.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tapped Technician Detail Overlay (Slides up from bottom / side panel) */}
              {selectedTech && (
                <div className="absolute bottom-4 inset-x-4 z-30 max-w-sm mx-auto animate-in slide-in-from-bottom duration-200">
                  <Card className="soft-shadow border-primary/20 bg-card rounded-2xl overflow-hidden">
                    <CardContent className="p-4 flex flex-col gap-3 relative">
                      <button
                        onClick={() => setSelectedTech(null)}
                        className="absolute top-2.5 end-2.5 p-1 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted tap"
                        aria-label="Close"
                      >
                        <X className="size-4" />
                      </button>

                      {/* Header quick details */}
                      <div className="flex items-start gap-3 pt-1">
                        <div className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm",
                          selectedTech.avatarTint
                        )}>
                          {selectedTech.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-foreground truncate">{selectedTech.name}</h4>
                          <p className="text-xs text-muted-foreground truncate">{selectedTech.specialty}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                            <StarRating rating={selectedTech.rating} reviewCount={selectedTech.reviewCount} size="sm" />
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              {t('map.distance', { distance: selectedTech.distanceKm.toFixed(1) })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action trigger footer */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground">Inspection Fee</span>
                          <span className="text-xs font-bold text-foreground">
                            {selectedTech.inspectionFee === 0 ? 'Free' : formatPKR(selectedTech.inspectionFee)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AvailabilityBadge status={selectedTech.status} />
                          <Button
                            size="sm"
                            className="tap h-9 font-semibold"
                            onClick={() => handleRequestTechNow(selectedTech)}
                          >
                            {t('map.request_now')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </CustomerLayout>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading Map Page...</div>}>
      <MapPageContent />
    </Suspense>
  )
}
