'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/i18n/provider'

interface Stop { id: string; name: string; latitude: number; longitude: number; order: number }
interface Route { id: string; name: string; stops: Stop[] }

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function totalDistance(stops: Stop[]): number {
  let d = 0
  for (let i = 0; i < stops.length - 1; i++) d += haversine(stops[i].latitude, stops[i].longitude, stops[i + 1].latitude, stops[i + 1].longitude)
  return d
}

// Nearest-neighbor heuristic
function optimizeRoute(stops: Stop[]): Stop[] {
  if (stops.length <= 2) return stops
  const result: Stop[] = [stops[0]]
  const remaining = [...stops.slice(1)]
  while (remaining.length > 0) {
    const last = result[result.length - 1]
    let nearestIdx = 0
    let nearestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(last.latitude, last.longitude, remaining[i].latitude, remaining[i].longitude)
      if (d < nearestDist) { nearestDist = d; nearestIdx = i }
    }
    result.push(remaining.splice(nearestIdx, 1)[0])
  }
  return result
}

export default function RouteOptimizationTab() {
  const { t } = useTranslation()
  const [routes, setRoutes] = useState<Route[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<{ before: number; after: number; optimized: Stop[] } | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    fetch('/api/admin/routes').then(r => r.json()).then(d => {
      setRoutes(d.routes || [])
      setLoading(false)
    })
  }, [])

  const runOptimization = useCallback(() => {
    const route = routes.find(r => r.id === selectedRouteId)
    if (!route || (route.stops?.length || 0) < 2) { showToast('⚠️ Select a route with 2+ stops'); return }
    const stops = route.stops || []
    const before = totalDistance(stops)
    const optimized = optimizeRoute([...stops])
    const after = totalDistance(optimized)
    setResult({ before, after, optimized })
  }, [routes, selectedRouteId])

  const applyOptimization = async () => {
    if (!result) return
    setSaving(true)
    try {
      // Update stop order via individual PATCH calls
      for (let i = 0; i < result.optimized.length; i++) {
        await fetch(`/api/stops`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: result.optimized[i].id, order: i + 1 })
        })
      }
      showToast('✅ Route order saved!')
      setResult(null)
    } catch {
      showToast('❌ Failed to save')
    }
    setSaving(false)
  }

  if (loading) return <div className="glass-panel" style={{ padding: '2rem' }}>{[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 50, marginBottom: 12, borderRadius: 10 }} />)}</div>

  const savings = result ? ((1 - result.after / result.before) * 100) : 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '0.875rem 1.5rem', background: 'rgba(16,185,129,0.15)', border: '1px solid var(--success)', borderRadius: 12, color: 'var(--text-main)', fontWeight: 500, backdropFilter: 'blur(12px)' }}>{toast}</motion.div>}</AnimatePresence>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem' }}>🧠 AI Route Optimization</h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Uses a nearest-neighbor heuristic to minimize total route distance.
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="input-label">Select Route</label>
            <select className="select-field" value={selectedRouteId} onChange={e => { setSelectedRouteId(e.target.value); setResult(null) }}>
              <option value="">Choose a route...</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.stops?.length || 0} stops)</option>)}
            </select>
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="btn btn-primary" onClick={runOptimization}
            style={{ height: 44 }}>
            🔬 Optimize
          </motion.button>
        </div>

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '1.5rem' }}>
            {/* Before/After Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Before</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)' }}>{result.before.toFixed(2)} km</div>
              </div>
              <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>After</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{result.after.toFixed(2)} km</div>
              </div>
              <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Saved</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: savings > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                  {savings > 0 ? `−${savings.toFixed(1)}%` : 'Optimal ✓'}
                </div>
              </div>
            </div>

            {/* Optimized Stop Order */}
            <h4 style={{ marginBottom: '0.75rem' }}>Optimized Stop Order</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {result.optimized.map((stop, i) => (
                <motion.div key={stop.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--surface-border)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{stop.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}</div>
                  </div>
                  {stop.order !== i + 1 && <span className="badge badge-warning" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>Moved</span>}
                </motion.div>
              ))}
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', fontWeight: 700 }}
              onClick={applyOptimization} disabled={saving}>
              {saving ? 'Saving...' : '✅ Apply Optimized Order'}
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
