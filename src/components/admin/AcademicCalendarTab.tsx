'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/i18n/provider'
import { Calendar, CalendarPlus, CheckCircle, AlertTriangle, Trash2, Edit2, Globe, Lock } from 'lucide-react'

interface AcademicEvent {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  type: string
  isPublic: boolean
  color: string | null
}

export default function AcademicCalendarTab() {
  const { t } = useTranslation()
  const [events, setEvents] = useState<AcademicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    type: 'EVENT',
    isPublic: true,
    color: '#1E3A8A'
  })
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success'|'error'>('success')

  const showToast = (m: string, type: 'success'|'error'='success') => { 
    setToast(m)
    setToastType(type)
    setTimeout(() => setToast(''), 3000) 
  }

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/calendar')
      const data = await res.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleSave = async () => {
    if (!form.title.trim() || !form.startDate) {
      showToast('Title and Start Date are required', 'error')
      return
    }

    const method = editingId ? 'PATCH' : 'POST'
    const url = editingId ? `/api/calendar/${editingId}` : '/api/calendar'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          endDate: form.endDate || null
        })
      })

      if (res.ok) {
        showToast(editingId ? 'Event updated!' : 'Event added!', 'success')
        setShowModal(false)
        setEditingId(null)
        setForm({ title: '', description: '', startDate: '', endDate: '', type: 'EVENT', isPublic: true, color: '#1E3A8A' })
        fetchEvents()
      } else {
        showToast('Failed to save event', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Event deleted', 'success')
        fetchEvents()
      } else {
        showToast('Failed to delete', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    }
  }

  const handleEdit = (event: AcademicEvent) => {
    setEditingId(event.id)
    setForm({
      title: event.title,
      description: event.description || '',
      startDate: new Date(event.startDate).toISOString().split('T')[0],
      endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '',
      type: event.type,
      isPublic: event.isPublic,
      color: event.color || '#1E3A8A'
    })
    setShowModal(true)
  }

  const typeLabels: Record<string, string> = {
    HOLIDAY: '️ Holiday',
    EXAM: 'Exam',
    EVENT: 'Event',
    TERM_START: 'Term Start',
    TERM_END: 'Term End',
    ASSEMBLY: 'Assembly'
  }

  if (loading) return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 12, borderRadius: 10 }} />)}
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} 
            style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'0.875rem 1.5rem', display:'flex', alignItems:'center', gap:'0.75rem',
              background: toastType === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border:`1px solid ${toastType === 'success' ? 'var(--success)' : 'var(--danger)'}`,
              borderRadius:12, color:'var(--text-main)', fontWeight:500, backdropFilter:'blur(12px)' }}>
            {toastType === 'error' ? <AlertTriangle size={18} color="var(--danger)"/> : <CheckCircle size={18} color="var(--success)"/>}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h2 style={{ margin:0, fontSize:'1.5rem', display:'flex', alignItems:'center', gap:10 }}><Calendar size={28}/> Academic Calendar</h2>
            <p style={{ color:'var(--text-muted)', fontSize:'0.9rem', marginTop:4 }}>Management of school holidays, exams, and special events</p>
          </div>
          <motion.button 
            whileHover={{ scale:1.04 }} 
            whileTap={{ scale:0.96 }} 
            className="btn btn-primary" 
            onClick={() => {
              setEditingId(null)
              setForm({ title: '', description: '', startDate: '', endDate: '', type: 'EVENT', isPublic: true, color: '#1E3A8A' })
              setShowModal(true)
            }}
          >
            <CalendarPlus size={20}/> Add Event
          </motion.button>
        </div>

        <div style={{ display:'grid', gap:'1rem' }}>
          {events.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)', background:'rgba(255,255,255,0.02)', borderRadius:12, border:'1px dashed var(--surface-border)' }}>
              No academic events scheduled yet.
            </div>
          ) : (
            events.map(event => (
              <motion.div 
                key={event.id}
                layout
                className="glass-card"
                style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1.25rem' }}
              >
                <div style={{ display:'flex', gap:'1.25rem', alignItems:'center' }}>
                  <div style={{ width:12, height:60, borderRadius:6, background: event.color || 'var(--primary)' }} />
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <h4 style={{ margin:0 }}>{event.title}</h4>
                      <span className="badge" style={{ fontSize:'0.65rem', background:'rgba(255,255,255,0.05)', color:'var(--text-muted)' }}>
                        {typeLabels[event.type] || event.type}
                      </span>
                      {event.isPublic ? <Globe size={14} color="var(--success)" /> : <Lock size={14} color="var(--text-dim)" />}
                    </div>
                    <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginTop:4 }}>
                      {new Date(event.startDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                      {event.endDate && ` — ${new Date(event.endDate).toLocaleDateString(undefined, { dateStyle: 'long' })}`}
                    </div>
                    {event.description && <div style={{ fontSize:'0.8rem', color:'var(--text-dim)', marginTop:4 }}>{event.description}</div>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <button onClick={() => handleEdit(event)} style={{ background:'none', border:'none', color:'var(--primary)', cursor:'pointer', padding:8 }} title="Edit"><Edit2 size={18}/></button>
                  <button onClick={() => handleDelete(event.id)} style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', padding:8 }} title="Delete"><Trash2 size={18}/></button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
            <motion.div className="modal-box" initial={{ scale:0.9, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.9, y:20 }}>
              <h3 style={{ marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:10 }}>
                {editingId ? <Edit2 size={24}/> : <CalendarPlus size={24}/>} 
                {editingId ? 'Edit Event' : 'Add New Event'}
              </h3>
              
              <div style={{ display:'grid', gap:'1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Event Title *</label>
                  <input className="input-field" placeholder="e.g. Mid-Term Break" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
                </div>

                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea className="input-field" style={{ minHeight:80, resize:'vertical' }} placeholder="Optional details..." value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div className="input-group">
                    <label className="input-label">Start Date *</label>
                    <input className="input-field" type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} />
                    {form.startDate && form.startDate < new Date().toISOString().split('T')[0] && (
                      <div style={{ fontSize:'0.72rem', color:'var(--warning)', marginTop:4 }}>This date is in the past — use this to log a historical event.</div>
                    )}
                  </div>
                  <div className="input-group">
                    <label className="input-label">End Date (Optional)</label>
                    <input className="input-field" type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))} />
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div className="input-group">
                    <label className="input-label">Type</label>
                    <select className="select-field" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                      {Object.entries(typeLabels).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Color Theme</label>
                    <input className="input-field" type="color" style={{ height:46, padding:4, cursor:'pointer' }} value={form.color} onChange={e => setForm(p => ({...p, color: e.target.value}))} />
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                   <input 
                      type="checkbox" 
                      id="isVisible" 
                      checked={form.isPublic} 
                      onChange={e => setForm(p => ({ ...p, isPublic: e.target.checked }))} 
                      style={{ width:20, height:20, cursor:'pointer' }}
                    />
                   <label htmlFor="isVisible" style={{ cursor:'pointer', fontSize:'0.9rem', fontWeight:500 }}>Visible to Parents & Students</label>
                </div>
              </div>

              <div style={{ display:'flex', gap:'1rem', marginTop:'2rem' }}>
                <button className="btn" style={{ flex:1, background:'rgba(0,0,0,0.05)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <motion.button whileTap={{ scale:0.97 }} className="btn btn-primary" style={{ flex:2 }} onClick={handleSave}>
                  {editingId ? 'Update Event' : 'Create Event'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
