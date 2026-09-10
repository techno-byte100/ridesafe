'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Navigation, Flag, ArrowDown, Info, Route } from 'lucide-react'

interface RouteRecord {
  id: string
  name: string
  morningTime?: string | null
  afternoonTime?: string | null
}

interface StopRecord {
  id: string
  routeId: string
  name: string
  latitude: number
  longitude: number
  order: number
}

const HC = {
  bg:         '#08080A',
  bgSoft:     '#0E0E11',
  surface:    '#141417',
  surface2:   '#1C1C21',
  line:       '#26262C',
  lineStrong: '#3A3A43',
  text:       '#FFFFFF',
  text2:      '#A6A6B2',
  text3:      '#6E6E7A',
  yellow:     '#FFD60A',
  onYellow:   '#08080A',
  success:    '#30D158',
  info:       '#0A84FF',
  r:          '12px',
  pill:       '9999px',
}

function StyledSelect({
  label, value, onChange, options, placeholder, disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  disabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: HC.text3 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          background: HC.surface2,
          border: `1px solid ${HC.lineStrong}`,
          borderRadius: HC.r,
          color: value ? HC.text : HC.text3,
          fontSize: 14,
          padding: '10px 14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          outline: 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function StopBadge({ type }: { type: 'boarding' | 'intermediate' | 'ending' }) {
  const map = {
    boarding:     { color: HC.success, label: 'Boarding' },
    intermediate: { color: HC.info,    label: 'Stop' },
    ending:       { color: '#FF6B35',  label: 'Ending' },
  }
  const { color, label } = map[type]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
      padding: '3px 9px', borderRadius: HC.pill,
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  )
}

export default function RouteStopsTab() {
  const [routes, setRoutes]               = useState<RouteRecord[]>([])
  const [routesLoading, setRoutesLoading] = useState(true)
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [allStops, setAllStops]               = useState<StopRecord[]>([])
  const [stopsLoading, setStopsLoading]       = useState(false)
  const [boardingStopId, setBoardingStopId]   = useState('')
  const [endingStopId, setEndingStopId]       = useState('')

  useEffect(() => {
    fetch('/api/admin/routes')
      .then(r => r.json())
      .then(d => setRoutes(d.routes || []))
      .catch(() => setRoutes([]))
      .finally(() => setRoutesLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedRouteId) {
      setAllStops([])
      setBoardingStopId('')
      setEndingStopId('')
      return
    }
    setStopsLoading(true)
    setBoardingStopId('')
    setEndingStopId('')
    fetch(`/api/stops?routeId=${selectedRouteId}`)
      .then(r => r.json())
      .then(d => setAllStops(d.stops || []))
      .catch(() => setAllStops([]))
      .finally(() => setStopsLoading(false))
  }, [selectedRouteId])

  const stopOptions    = allStops.map(s => ({ value: s.id, label: `${s.order}. ${s.name}` }))
  const boardingIdx    = allStops.findIndex(s => s.id === boardingStopId)
  const endingIdx      = allStops.findIndex(s => s.id === endingStopId)
  const selectionValid =
    boardingStopId && endingStopId &&
    boardingStopId !== endingStopId &&
    boardingIdx !== -1 && endingIdx !== -1 &&
    boardingIdx < endingIdx

  const routeSlice: StopRecord[] = selectionValid
    ? allStops.slice(boardingIdx, endingIdx + 1)
    : []

  const totalStops    = routeSlice.length
  const intermediates = routeSlice.slice(1, -1)

  let validationMsg = ''
  if (boardingStopId && endingStopId) {
    if (boardingStopId === endingStopId)             validationMsg = 'Boarding and ending point must be different stops.'
    else if (boardingIdx > endingIdx)                validationMsg = 'Boarding point must come before the ending point in the route order.'
    else if (boardingIdx === -1 || endingIdx === -1) validationMsg = 'Selected stops could not be found in this route.'
  }

  const routeOptions = routes.map(r => ({ value: r.id, label: r.name }))

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${HC.yellow}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Route size={18} color={HC.yellow} />
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: HC.text }}>Route Stops</h2>
        </div>
        <p style={{ margin: 0, fontSize: 13.5, color: HC.text2, lineHeight: 1.55 }}>
          Select a route, then choose a boarding and ending point to view the complete stop sequence in order.
        </p>
      </div>

      {/* Step 1 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        style={{ background: HC.surface, border: `1px solid ${HC.line}`, borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: HC.text3, marginBottom: '1rem' }}>
          Step 1 — Choose a Route
        </div>
        {routesLoading ? (
          <div style={{ color: HC.text3, fontSize: 13 }}>Loading routes…</div>
        ) : routes.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: HC.r, background: `${HC.yellow}11`, border: `1px solid ${HC.yellow}33`, color: HC.text2, fontSize: 13 }}>
            <Info size={15} color={HC.yellow} />
            No routes found. Add routes from the Fleet or Schedule tabs first.
          </div>
        ) : (
          <StyledSelect label="Route" value={selectedRouteId} onChange={setSelectedRouteId} options={routeOptions} placeholder="— Select a route —" />
        )}
      </motion.div>

      {/* Step 2 */}
      <AnimatePresence>
        {selectedRouteId && (
          <motion.div key="stop-selector" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
            style={{ background: HC.surface, border: `1px solid ${HC.line}`, borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: HC.text3, marginBottom: '1rem' }}>
              Step 2 — Select Boarding &amp; Ending Points
            </div>
            {stopsLoading ? (
              <div style={{ color: HC.text3, fontSize: 13 }}>Loading stops…</div>
            ) : allStops.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: HC.r, background: `${HC.yellow}11`, border: `1px solid ${HC.yellow}33`, color: HC.text2, fontSize: 13 }}>
                <Info size={15} color={HC.yellow} />
                This route has no stops defined yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <StyledSelect label="Boarding Point" value={boardingStopId} onChange={setBoardingStopId} options={stopOptions} placeholder="— Select boarding point —" />
                <StyledSelect label="Ending Point"   value={endingStopId}   onChange={setEndingStopId}   options={stopOptions} placeholder="— Select ending point —" />
              </div>
            )}
            {validationMsg && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: HC.r, background: 'rgba(255,69,58,0.10)', border: '1px solid rgba(255,69,58,0.25)', color: '#FF453A', fontSize: 13 }}>
                <Info size={15} />{validationMsg}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {selectionValid && routeSlice.length > 0 && (
          <motion.div key="route-result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

            {/* Summary bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: `${HC.yellow}10`, border: `1px solid ${HC.yellow}33`, borderRadius: 12, padding: '12px 18px', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Route size={16} color={HC.yellow} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: HC.text }}>
                  {routes.find(r => r.id === selectedRouteId)?.name ?? 'Route'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: HC.yellow, lineHeight: 1 }}>{totalStops}</div>
                  <div style={{ fontSize: 10.5, color: HC.text3, marginTop: 2 }}>Total Stops</div>
                </div>
                <div style={{ width: 1, background: HC.line }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: HC.info, lineHeight: 1 }}>{intermediates.length}</div>
                  <div style={{ fontSize: 10.5, color: HC.text3, marginTop: 2 }}>Intermediate</div>
                </div>
              </div>
            </div>

            {/* Sequence */}
            <div style={{ background: HC.surface, border: `1px solid ${HC.line}`, borderRadius: 16, padding: '1.5rem' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: HC.text3, marginBottom: '1.25rem' }}>
                Stop Sequence — in order
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {routeSlice.map((stop, idx) => {
                  const isBoarding     = idx === 0
                  const isEnding       = idx === routeSlice.length - 1
                  const isIntermediate = !isBoarding && !isEnding
                  const type           = isBoarding ? 'boarding' : isEnding ? 'ending' : 'intermediate'
                  const dotColor       = isBoarding ? HC.success : isEnding ? '#FF6B35' : HC.info
                  return (
                    <div key={stop.id}>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 16px', borderRadius: HC.r,
                          background: isBoarding ? `${HC.success}0D` : isEnding ? '#FF6B350D' : 'transparent',
                          border: `1px solid ${isBoarding ? HC.success + '33' : isEnding ? '#FF6B3533' : HC.line}`,
                        }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: `${dotColor}22`, border: `2px solid ${dotColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isBoarding     && <Navigation size={14} color={dotColor} />}
                          {isEnding       && <Flag size={14} color={dotColor} />}
                          {isIntermediate && <MapPin size={14} color={dotColor} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 700, color: HC.text, marginBottom: 2 }}>{stop.name}</div>
                          <div style={{ fontSize: 11.5, color: HC.text3 }}>Stop #{stop.order} &nbsp;·&nbsp; {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}</div>
                        </div>
                        <StopBadge type={type} />
                      </motion.div>
                      {idx < routeSlice.length - 1 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: 28, paddingTop: 4, paddingBottom: 4 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: 2, height: 8, background: HC.lineStrong }} />
                            <ArrowDown size={12} color={HC.text3} />
                            <div style={{ width: 2, height: 8, background: HC.lineStrong }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
