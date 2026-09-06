'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronRight } from 'lucide-react'

interface AcademicEvent {
  id: string
  title: string
  startDate: string
  endDate: string | null
  type: string
  color: string | null
}

export default function CalendarCard() {
  const [events, setEvents] = useState<AcademicEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/calendar')
      .then(r => r.json())
      .then(data => {
        setEvents(data.events || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="glass-panel skeleton" style={{ height: 200, borderRadius: 20 }} />

  // Only show upcoming 3 events
  const upcomingEvents = events
    .filter(e => new Date(e.startDate) >= new Date(new Date().setHours(0,0,0,0)))
    .slice(0, 3)

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '100%', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
        <div>
          <h3 style={{ margin:0, fontSize:'1.1rem', display:'flex', alignItems:'center', gap:8 }}>
            <Calendar size={20} color="var(--primary)"/> School Calendar
          </h3>
          <p style={{ margin:'4px 0 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Upcoming key dates</p>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', flex:1 }}>
        {upcomingEvents.length === 0 ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', color:'var(--text-dim)', textAlign:'center' }}>
            No upcoming events scheduled.
          </div>
        ) : (
          upcomingEvents.map(event => (
            <motion.div 
              key={event.id}
              initial={{ opacity:0, x:-10 }}
              animate={{ opacity:1, x:0 }}
              style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.75rem', borderRadius:12, background:'var(--surface-2)', border:'1px solid var(--surface-border)' }}
            >
              <div style={{ 
                width:40, height:40, borderRadius:10, 
                background: `${event.color}15` || 'var(--primary-glow)', 
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' 
              }}>
                <span style={{ fontSize:'0.6rem', fontWeight:800, color: event.color || 'var(--primary)', textTransform:'uppercase' }}>
                  {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short' })}
                </span>
                <span style={{ fontSize:'0.9rem', fontWeight:800, color: event.color || 'var(--primary)', marginTop:-2 }}>
                  {new Date(event.startDate).getDate()}
                </span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--text-main)' }}>{event.title}</div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>
                  {event.type.replace('_', ' ')}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {events.length > 3 && (
        <button style={{ 
          marginTop:'1rem', background:'none', border:'none', color:'var(--primary)', 
          fontSize:'0.85rem', fontWeight:600, cursor:'pointer', display:'flex', 
          alignItems:'center', gap:4, padding:0 
        }}>
          View full calendar <ChevronRight size={16}/>
        </button>
      )}
    </div>
  )
}
