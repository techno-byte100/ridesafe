'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, CalendarPlus, CheckCircle, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from '@/i18n/provider'

interface Shift {
  id: string; driverId: string; date: string; startTime: string; endTime: string; status: string
  driver: { name: string; phone: string }
}
interface Driver { id: string; name: string; role: string }

const defaultForm = { driverId: '', date: '', startTime: '07:00', endTime: '09:00' }

function mondayOf(d: Date) {
  const date = new Date(d)
  const day = date.getDay() // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day // shift back to Monday
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export default function ScheduleTab() {
  const { t } = useTranslation()
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [shifts, setShifts] = useState<Shift[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success'|'error'>('success')

  const showToast = (m: string, type: 'success'|'error'='success') => { setToast(m); setToastType(type); setTimeout(() => setToast(''), 3000) }

  const loadShifts = () => fetch('/api/shifts').then(r => r.json()).then(d => setShifts(d.shifts || []))

  useEffect(() => {
    Promise.all([
      fetch('/api/shifts').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
    ]).then(([s, u]) => {
      setShifts(s.shifts || [])
      setDrivers((u.users || []).filter((u: Driver) => u.role === 'DRIVER'))
      setLoading(false)
    })
  }, [])

  const openAddModal = () => { setEditingId(null); setForm(defaultForm); setShowModal(true) }

  const openEditModal = (shift: Shift) => {
    setEditingId(shift.id)
    setForm({
      driverId: shift.driverId,
      date: new Date(shift.date).toISOString().slice(0, 10),
      startTime: shift.startTime,
      endTime: shift.endTime,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.driverId || !form.date) { showToast('Driver and date required', 'error'); return }
    const res = editingId
      ? await fetch(`/api/shifts/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      : await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { showToast(editingId ? 'Shift updated!' : 'Shift added!', 'success'); setShowModal(false); setEditingId(null); await loadShifts() }
    else showToast('Failed', 'error')
  }

  const handleDelete = async () => {
    if (!editingId) return
    const res = await fetch(`/api/shifts/${editingId}`, { method: 'DELETE' })
    if (res.ok) { showToast('Shift removed', 'success'); setShowModal(false); setEditingId(null); await loadShifts() }
    else showToast('Failed to remove', 'error')
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const statusColor: Record<string, string> = { SCHEDULED: '#3B82F6', ACTIVE: '#10B981', COMPLETED: '#6B7280', CANCELLED: '#EF4444' }

  if (loading) return <div className="glass-panel" style={{ padding: '2rem' }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 50, marginBottom: 12, borderRadius: 10 }} />)}</div>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0,y:-20 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} 
            style={{ position:'fixed',top:20,right:20,zIndex:9999,padding:'0.875rem 1.5rem', display:'flex', alignItems:'center', gap:'0.75rem',
              background: toastType === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border:`1px solid ${toastType === 'success' ? 'var(--success)' : 'var(--danger)'}`,
              borderRadius:12,color:'var(--text-main)',fontWeight:500,backdropFilter:'blur(12px)' }}>
            {toastType === 'error' ? <AlertTriangle size={18} color="var(--danger)"/> : <CheckCircle size={18} color="var(--success)"/>}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h3 style={{ margin:0, fontSize:'1.3rem', display:'flex', alignItems:'center', gap:8 }}><CalendarDays size={22}/> Driver Shift Schedule</h3>
            <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginTop:4 }}>{shifts.length} shifts scheduled</div>
          </div>
          <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }} className="btn btn-primary" onClick={openAddModal}>+ Add Shift</motion.button>
        </div>

        {/* Week navigation */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem' }}>
          <button className="btn" style={{ padding:'0.4rem 0.8rem', fontSize:'0.8rem', background:'rgba(255,255,255,0.06)' }} onClick={() => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d })}>&larr; Prev Week</button>
          <div style={{ fontSize:'0.85rem', fontWeight:600, minWidth:180, textAlign:'center' }}>
            {weekStart.toLocaleDateString(undefined, { day:'numeric', month:'short' })} &ndash; {new Date(weekStart.getTime() + 6*86400000).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })}
          </div>
          <button className="btn" style={{ padding:'0.4rem 0.8rem', fontSize:'0.8rem', background:'rgba(255,255,255,0.06)' }} onClick={() => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d })}>Next Week &rarr;</button>
          <button className="btn" style={{ padding:'0.4rem 0.8rem', fontSize:'0.8rem', background:'rgba(255,255,255,0.06)' }} onClick={() => setWeekStart(mondayOf(new Date()))}>This Week</button>
        </div>

        {/* Weekly grid header */}
        <div style={{ display:'grid', gridTemplateColumns:'120px repeat(7,1fr)', gap:4, marginBottom:8 }}>
          <div style={{ fontWeight:700, fontSize:'0.8rem', color:'var(--text-muted)', padding:'0.5rem' }}>Driver</div>
          {days.map((d, i) => <div key={d} style={{ fontWeight:700, fontSize:'0.75rem', color:'var(--text-muted)', textAlign:'center', padding:'0.5rem' }}>{d} <span style={{ opacity:0.6, fontWeight:400 }}>{new Date(weekStart.getTime() + i * 86400000).getDate()}</span></div>)}
        </div>

        {/* Driver rows */}
        {drivers.map(driver => {
          const driverShifts = shifts.filter(s => s.driverId === driver.id)
          return (
            <div key={driver.id} style={{ display:'grid', gridTemplateColumns:'120px repeat(7,1fr)', gap:4, marginBottom:4 }}>
              <div style={{ fontSize:'0.82rem', fontWeight:600, padding:'0.5rem', borderRadius:8, background:'rgba(255,255,255,0.03)' }}>{driver.name}</div>
              {days.map((_, di) => {
                const colDate = new Date(weekStart.getTime() + di * 86400000)
                const dayShift = driverShifts.find(s => new Date(s.date).toDateString() === colDate.toDateString())
                return (
                  <div key={di}
                    onClick={() => dayShift && openEditModal(dayShift)}
                    title={dayShift ? 'Click to edit this shift' : undefined}
                    style={{ minHeight:40, borderRadius:6, background: dayShift ? `${statusColor[dayShift.status]}22` : 'rgba(255,255,255,0.02)', border: `1px solid ${dayShift ? statusColor[dayShift.status] + '44' : 'var(--surface-border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', color: dayShift ? statusColor[dayShift.status] : 'var(--text-muted)', cursor: dayShift ? 'pointer' : 'default' }}>
                    {dayShift ? `${dayShift.startTime}-${dayShift.endTime}` : '—'}
                  </div>
                )
              })}
            </div>
          )
        })}
        {drivers.length === 0 && <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>No drivers registered yet.</div>}
      </div>

      {/* Add Shift Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
            <motion.div className="modal-box" initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}>
              <h3 style={{ marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:8 }}>
                {editingId ? <Pencil size={20}/> : <CalendarPlus size={20}/>} {editingId ? 'Edit Driver Shift' : 'Add Driver Shift'}
              </h3>
              <div style={{ display:'grid', gap:'1rem' }}>
                <select className="select-field" value={form.driverId} onChange={e => setForm(p => ({...p, driverId: e.target.value}))}>
                  <option value="">Select Driver</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input className="input-field" type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <input className="input-field" type="time" step="60" value={form.startTime} onChange={e => setForm(p => ({...p, startTime: e.target.value}))} />
                  <input className="input-field" type="time" step="60" value={form.endTime} onChange={e => setForm(p => ({...p, endTime: e.target.value}))} />
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.5rem' }}>
                {editingId && (
                  <motion.button whileTap={{ scale:0.97 }} className="btn" style={{ background:'rgba(239,68,68,0.12)', color:'var(--danger)', border:'1px solid rgba(239,68,68,0.3)', display:'flex', alignItems:'center', gap:6 }} onClick={handleDelete}>
                    <Trash2 size={14}/> Remove
                  </motion.button>
                )}
                <button className="btn" style={{ flex:1, background:'rgba(255,255,255,0.06)' }} onClick={() => { setShowModal(false); setEditingId(null) }}>Cancel</button>
                <motion.button whileTap={{ scale:0.97 }} className="btn btn-primary" style={{ flex:2 }} onClick={handleSave}>✓ {editingId ? 'Update Shift' : 'Save Shift'}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
