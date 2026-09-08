'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { RefreshCw, Bus, MapPin, Navigation, Clock, AlertTriangle, Satellite, Radio, Smartphone } from 'lucide-react'
import { useTranslation } from '@/i18n/provider'

// Leaflet must be dynamically imported — it uses browser-only APIs
const BusMap = dynamic(() => import('@/components/shared/BusMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 340, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.75rem', border: '1px solid var(--surface-border)' }}>
      <div style={{ width: 22, height: 22, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading map…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
})

interface LiveTrip {
  id: string
  date: string
  status: string
  route: { name: string }
  driver: { name: string; phone?: string }
  bus?: { plateNumber: string }
}

interface DriverLocation {
  id: string
  name: string
  lastLatitude: number | null
  lastLongitude: number | null
  currentSpeedKmH: number | null
  lastLocationUpdate: string | null
  source: 'WIALON' | 'KATSANA' | 'MOBILE' | null
  distanceKm: number | null
  etaMins: number | null
  isNear: boolean
}

const SOURCE_META: Record<string, { label: string; icon: typeof Satellite }> = {
  WIALON:  { label: 'Wialon GPS',  icon: Satellite },
  KATSANA: { label: 'Katsana GPS', icon: Radio },
  MOBILE:  { label: 'Mobile GPS',  icon: Smartphone },
}

interface GpsStatus {
  connected: boolean
  error?: string
  message?: string
}

const STATUS_COLOR: Record<string, string> = {
  TRIP_CREATED: '#94A3B8',
  DRIVER_STARTED_ROUTE: '#3B82F6',
  BUS_EN_ROUTE: '#F59E0B',
  TRIP_COMPLETED: '#10B981',
}

const STATUS_LABEL: Record<string, string> = {
  TRIP_CREATED: 'Created',
  DRIVER_STARTED_ROUTE: 'Driver En Route',
  BUS_EN_ROUTE: 'Bus En Route',
  TRIP_COMPLETED: 'Completed',
}

export default function LiveTripsTab() {
  const { t } = useTranslation()
  const [trips, setTrips] = useState<LiveTrip[]>([])
  const [drivers, setDrivers] = useState<DriverLocation[]>([])
  const [wialonStatus, setWialonStatus] = useState<GpsStatus | null>(null)
  const [katsanaStatus, setKatsanaStatus] = useState<GpsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [tripsRes, driversRes, wialonRes, katsanaRes] = await Promise.all([
        fetch('/api/trips'),
        fetch('/api/location'),
        fetch('/api/tracking/wialon-status'),
        fetch('/api/tracking/katsana-status'),
      ])
      const [tripsData, driversData, wialonData, katsanaData] = await Promise.all([
        tripsRes.json(),
        driversRes.json(),
        wialonRes.json(),
        katsanaRes.json(),
      ])
      setTrips(tripsData.trips || [])
      setDrivers(driversData.drivers || [])
      setWialonStatus(wialonData)
      setKatsanaStatus(katsanaData)
      setLastRefresh(new Date())
    } catch (e) {
      console.error('[LiveTrips]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const activeTrips = trips.filter(t => t.status !== 'TRIP_COMPLETED')
  const activeDrivers = drivers.filter(d => d.lastLatitude && d.lastLongitude)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
      {[1, 2].map(i => (
        <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 8 }}><Navigation size={20} color="var(--success)" /> Live Control Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Wialon GPS status */}
          {wialonStatus && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem',
              padding: '0.35rem 0.9rem', borderRadius: 20,
              background: wialonStatus.connected ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: wialonStatus.connected ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${wialonStatus.connected ? 'rgba(21,128,61,0.2)' : 'rgba(185,28,28,0.2)'}`,
              fontWeight: 600,
            }}>
              <Satellite size={13} />
              Wialon: {wialonStatus.connected ? 'Connected' : 'Offline'}
            </div>
          )}
          {/* Katsana GPS status */}
          {katsanaStatus && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem',
              padding: '0.35rem 0.9rem', borderRadius: 20,
              background: katsanaStatus.connected ? 'var(--success-bg)' : 'var(--warning-bg)',
              color: katsanaStatus.connected ? 'var(--success)' : 'var(--warning)',
              border: `1px solid ${katsanaStatus.connected ? 'rgba(21,128,61,0.2)' : 'rgba(180,83,9,0.2)'}`,
              fontWeight: 600,
            }}>
              <Radio size={13} />
              Katsana: {katsanaStatus.connected ? 'Connected' : katsanaStatus.error?.includes('not configured') ? 'Not Configured' : 'Offline'}
            </div>
          )}
          {/* GPS-online drivers, any source */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.35rem 0.9rem', borderRadius: 20, background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid rgba(29,78,216,0.15)', fontWeight: 600 }}>
            <Smartphone size={13} /> {activeDrivers.length} GPS Active
          </div>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={fetchAll}
            className="btn"
            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} /> Refresh
          </motion.button>
        </div>
      </div>

      {/* Live Map */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={18} color="var(--primary)" /> Live Bus Map
          {activeDrivers.length === 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
              No drivers broadcasting GPS right now
            </span>
          )}
        </h3>
        <BusMap drivers={drivers} />
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '0.75rem' }}>
        {[
          { icon: <Bus size={20} />, label: 'Active Trips', val: activeTrips.length, color: 'var(--primary)' },
          { icon: <Navigation size={20} />, label: 'GPS Online', val: activeDrivers.length, color: 'var(--success)' },
          { icon: <Clock size={20} />, label: 'Total Trips', val: trips.length, color: 'var(--info)' },
          { icon: <AlertTriangle size={20} />, label: 'Completed', val: trips.filter(t => t.status === 'TRIP_COMPLETED').length, color: 'var(--text-muted)' },
        ].map(({ icon, label, val, color }) => (
          <div key={label} className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ color, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Trip cards */}
      <div>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Active Trips</h3>
        {trips.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Bus size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No trips found</div>
            <div style={{ fontSize: '0.85rem' }}>Trips will appear here once drivers start a route.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
            {trips.map(trip => {
              const driverLoc = drivers.find(d => d.name === trip.driver.name)
              const isActive = trip.status !== 'TRIP_COMPLETED'
              const statusColor = STATUS_COLOR[trip.status] || '#94A3B8'
              const isSelected = selectedTripId === trip.id

              return (
                <motion.div
                  key={trip.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedTripId(isSelected ? null : trip.id)}
                  className="glass-panel"
                  style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: `3px solid ${statusColor}`, transition: 'box-shadow 0.2s', boxShadow: isSelected ? '0 0 0 2px var(--primary)' : undefined }}
                >
                  {/* Trip header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Bus size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} /> {trip.route.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(trip.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </div>
                    </div>
                    <span className="badge" style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40`, fontSize: '0.7rem' }}>
                      {STATUS_LABEL[trip.status] || trip.status}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Driver</div>
                      <div style={{ fontWeight: 600 }}>{trip.driver.name}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Bus Plate</div>
                      <div style={{ fontWeight: 600 }}>{trip.bus?.plateNumber || '—'}</div>
                    </div>

                    {/* Real GPS data — only if driver is broadcasting */}
                    {driverLoc?.lastLatitude ? (
                      <>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Speed</div>
                          <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                            {Math.round(driverLoc.currentSpeedKmH || 0)} km/h
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>ETA to School</div>
                          <div style={{ fontWeight: 600 }}>
                            {driverLoc.etaMins !== null ? `~${driverLoc.etaMins} min` : '—'}
                          </div>
                        </div>
                        {driverLoc.isNear && (
                          <div style={{ gridColumn: '1/-1' }}>
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> Approaching School Zone</span>
                          </div>
                        )}
                        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {(() => {
                            const meta = SOURCE_META[driverLoc.source || 'MOBILE']
                            const SourceIcon = meta.icon
                            return (
                              <span className="badge" style={{ background: 'var(--success-bg)', color: 'var(--success)', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <SourceIcon size={11} /> {meta.label} Live
                              </span>
                            )
                          })()}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            Last update: {driverLoc.lastLocationUpdate ? new Date(driverLoc.lastLocationUpdate).toLocaleTimeString() : '—'}
                          </span>
                        </div>
                      </>
                    ) : isActive ? (
                      <div style={{ gridColumn: '1/-1' }}>
                        <span className="badge" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> Waiting for driver GPS…
                        </span>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Driver location table */}
      {drivers.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Driver GPS Status</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--surface-border)' }}>
                  {['Driver', 'Source', 'Latitude', 'Longitude', 'Speed', 'Distance', 'ETA', 'Last Update', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--surface-border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{d.name}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{d.source ? SOURCE_META[d.source].label : '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{d.lastLatitude?.toFixed(5) ?? '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{d.lastLongitude?.toFixed(5) ?? '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>{d.currentSpeedKmH ? `${Math.round(d.currentSpeedKmH)} km/h` : '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>{d.distanceKm != null ? `${d.distanceKm.toFixed(2)} km` : '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>{d.etaMins != null ? `~${d.etaMins} min` : '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {d.lastLocationUpdate ? new Date(d.lastLocationUpdate).toLocaleTimeString() : 'Never'}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      {d.lastLatitude ? (
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>🟢 Live</span>
                      ) : (
                        <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>No Signal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
