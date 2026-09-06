'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix missing marker icons in React-Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

type Driver = {
  id: string
  name: string
  lastLatitude: number | null
  lastLongitude: number | null
  distanceKm?: number | null
  etaMins?: number | null
  isNear?: boolean
}

export default function BusMap({ drivers }: { drivers: Driver[] }) {
  const activeDrivers = drivers.filter(d => d.lastLatitude !== null && d.lastLongitude !== null)

  if (activeDrivers.length === 0) {
    return (
      <div style={{ height: 300, width: '100%', borderRadius: 12, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No active buses currently sharing location
      </div>
    )
  }

  // Center on the first active driver
  const center: [number, number] = [activeDrivers[0].lastLatitude!, activeDrivers[0].lastLongitude!]

  return (
    <div style={{ height: 300, width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {activeDrivers.map(driver => (
          <Marker
            key={driver.id}
            position={[driver.lastLatitude!, driver.lastLongitude!]}
            icon={icon}
          >
            <Popup>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{driver.name} (Bus)</div>
              {driver.etaMins !== undefined && driver.etaMins !== null && (
                <div style={{ fontSize: '0.85rem' }}>ETA to School: ~{driver.etaMins} mins</div>
              )}
              {driver.isNear && (
                <div style={{ marginTop: '4px', display: 'inline-block', background: 'var(--success)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  Approaching School Zone
                </div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
