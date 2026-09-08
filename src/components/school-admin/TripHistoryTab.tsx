'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from '@/i18n/provider'

interface TripRecord {
  id: string; date: string; status: string; routeName: string; driverName: string
  attendanceCount: number; pickedUp: number; droppedOff: number; absent: number; avgRating: string | null
}

export default function TripHistoryTab() {
  const { t } = useTranslation()
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback((p: number) => {
    setLoading(true)
    fetch(`/api/trips/history?page=${p}`).then(r => r.json()).then(d => {
      setTrips(d.trips || []); setTotalPages(d.totalPages || 1); setPage(p); setLoading(false)
    })
  }, [])
  // eslint-disable-next-line react-compiler/react-compiler
  useEffect(() => { load(1) }, [load])

  const statusColor: Record<string, string> = { TRIP_CREATED: '#6B7280', DRIVER_STARTED_ROUTE: '#3B82F6', BUS_EN_ROUTE: '#F59E0B', TRIP_COMPLETED: '#10B981' }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>{t('trips.title')}</h3>

        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:60, marginBottom:10, borderRadius:10 }} />)
        ) : (
          <div style={{ display:'grid', gap:'0.75rem' }}>
            {trips.map(trip => (
              <motion.div key={trip.id} initial={{ opacity:0 }} animate={{ opacity:1 }} whileHover={{ scale:1.005 }}
                style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', padding:'1rem 1.25rem', background:'rgba(255,255,255,0.02)', borderRadius:12, border:'1px solid var(--surface-border)' }}>
                <div>
                  <div style={{ fontWeight:600, marginBottom:4 }}>
                    {trip.routeName}
                    <span style={{ fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:400, marginLeft:8 }}>
                      {new Date(trip.date).toLocaleDateString()} · {trip.driverName}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:'1rem', fontSize:'0.8rem', color:'var(--text-muted)' }}>
                    <span>{trip.pickedUp} picked</span>
                    <span>{trip.droppedOff} dropped</span>
                    <span>{trip.absent} absent</span>
                    {trip.avgRating && <span>⭐ {trip.avgRating}</span>}
                  </div>
                </div>
                <span className="badge" style={{ background:`${statusColor[trip.status] || '#6B7280'}22`, color:statusColor[trip.status] || '#6B7280', fontSize:'0.75rem' }}>
                  {trip.status.replace(/_/g,' ')}
                </span>
              </motion.div>
            ))}
            {trips.length === 0 && <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>No trip history yet.</div>}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem', marginTop:'1.5rem' }}>
            <button className="btn" disabled={page <= 1} onClick={() => load(page - 1)} style={{ background:'rgba(255,255,255,0.06)', color:'var(--text-main)' }}>← Prev</button>
            <span style={{ padding:'0.5rem 1rem', color:'var(--text-muted)', fontSize:'0.85rem' }}>Page {page} of {totalPages}</span>
            <button className="btn" disabled={page >= totalPages} onClick={() => load(page + 1)} style={{ background:'rgba(255,255,255,0.06)', color:'var(--text-main)' }}>Next →</button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
