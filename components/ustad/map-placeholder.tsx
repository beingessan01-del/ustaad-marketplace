'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type Pin = { top: string; left: string; active?: boolean }

const markers: Pin[] = [
  { top: '28%', left: '22%' },
  { top: '58%', left: '38%' },
  { top: '40%', left: '68%' },
  { top: '72%', left: '76%' },
]

function parsePercent(val: string): number {
  return parseFloat(val.replace('%', ''))
}

function percentToLatLng(topStr: string, leftStr: string) {
  const top = parsePercent(topStr)
  const left = parsePercent(leftStr)
  
  const latMin = 33.7154
  const latMax = 33.7434
  const lngMin = 73.0381
  const lngMax = 73.0741
  
  const lat = latMax - (top / 100) * (latMax - latMin)
  const lng = lngMin + (left / 100) * (lngMax - lngMin)
  
  return { lat, lng }
}

export function MapPlaceholder({
  className,
  pins,
}: {
  className?: string
  pins?: Pin[]
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const markersToRender = pins || markers

  const postPins = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const list = markersToRender.map((p) => {
        const { lat, lng } = percentToLatLng(p.top, p.left)
        const isCustomer = p.top === '50%' && p.left === '50%'
        return {
          lat,
          lng,
          isCustomer,
          active: p.active
        }
      })
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_PINS',
        pins: list
      }, '*')
    }
  }

  useEffect(() => {
    postPins()
  }, [markersToRender])

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
      width: 12px;
      height: 12px;
      background-color: #2F6FED;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      top: -6px;
      left: -6px;
    }
    .user-pulse-icon::before {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      background-color: rgba(47, 111, 237, 0.4);
      border-radius: 50%;
      top: -9px;
      left: -9px;
      animation: pulse 1.8s infinite ease-in-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    
    .tech-active-icon {
      position: relative;
    }
    .tech-active-icon::after {
      content: '';
      position: absolute;
      width: 12px;
      height: 12px;
      background-color: #E0A100;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      top: -6px;
      left: -6px;
    }
    .tech-active-icon::before {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      background-color: rgba(224, 161, 0, 0.4);
      border-radius: 50%;
      top: -9px;
      left: -9px;
      animation: pulse-orange 1.8s infinite ease-in-out;
    }
    @keyframes pulse-orange {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    
    .tech-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      background-color: #2F6FED;
      color: white;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([33.7294, 73.0561], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var markersGroup = L.layerGroup().addTo(map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          map.setView([position.coords.latitude, position.coords.longitude], 14);
        },
        function(error) {
          // Centered at default
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    window.addEventListener('message', function(event) {
      var message = event.data;
      if (message.type === 'UPDATE_PINS') {
        markersGroup.clearLayers();
        var pins = message.pins;
        
        pins.forEach(function(pin) {
          var lat = pin.lat;
          var lng = pin.lng;
          
          var icon;
          if (pin.isCustomer) {
            icon = L.divIcon({
              className: 'user-pulse-icon',
              iconSize: [0, 0]
            });
          } else if (pin.active) {
            icon = L.divIcon({
              className: 'tech-active-icon',
              iconSize: [0, 0]
            });
          } else {
            icon = L.divIcon({
              className: '',
              html: '<div class="tech-pin"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 24]
            });
          }
          
          L.marker([lat, lng], { icon: icon }).addTo(markersGroup);
        });
      }
    });
  </script>
</body>
</html>
  `

  return (
    <div
      className={cn(
        'map-grid relative w-full overflow-hidden rounded-2xl border border-border',
        className,
      )}
      role="img"
      aria-label="Map showing nearby technicians"
    >
      <iframe
        ref={iframeRef}
        srcDoc={mapHtml}
        onLoad={postPins}
        className="absolute inset-0 w-full h-full border-0 opacity-90"
      />
    </div>
  )
}
