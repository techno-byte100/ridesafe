'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, CircleDashed, ShieldAlert, Search, Settings } from 'lucide-react'
import { useTranslation } from '@/i18n/provider'

interface MaintenanceLog {
  id: string; busId: string; type: string; description: string; scheduledDate: string
  completedDate: string | null; status: string; cost: number | null
  bus: { plateNumber: string; status: string }
}

const TYPES = ['OIL_CHANGE', 'TIRE', 'BRAKE', 'INSPECTION', 'OTHER']
const STATUS_COLOR: Record<string, string> = { SCHEDULED: '#3B82F6', IN_PROGRESS: '#F59E0B', COMPLETED: '#10B981', OVERDUE: '#EF4444' }
const TYPE_ICON: Record<string, React.ReactNode> = { OIL_CHANGE: <Wrench size={18}/>, TIRE: <CircleDashed size={18}/>, BRAKE: <ShieldAlert size={18}/>, INSPECTION: <Search size={18}/>, OTHER: <Settings size={18}/> }

interface Bus { id: string; plateNumber: string }

export default function MaintenanceTab() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [buses, setBuses] = useState<Bus[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ busId: '', type: 'INSPECTION', description: '', scheduledDate: '', cost: '' })
  const [toast, setToast] = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const reload = () => {
    Promise.all([
      fetch('/api/maintenance').then(r => r.json()),
      fetch('/api/admin/buses').then(r => r.json()),
    ]).then(([m, b]) => {
      setLogs(m.logs || [])
      setBuses(b.buses || [])
      setLoading(false)
    })
  }

  useEffect(() => { reload() }, [])

  const handleSave = async () => {
    if (!form.busId || !form.scheduledDate) { showToast('️ Bus and date required'); return }
    const res = await fetch('/api/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, cost: form.cost ? parseFloat(form.cost) : null }) })
    if (res.ok) { showToast('Maintenance logged!'); setShowModal(false); reload() }
    else showToast('Failed')
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/maintenance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, completedDate: status === 'COMPLETED' ? new Date().toISOString() : null }) })
    reload()
  }

  if (loading) return <div className="glass-panel" style={{ padding: '2rem' }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 50, marginBottom: 12, borderRadius: 10 }} />)}</div>

  const overdue = logs.filter(l => l.status !== 'COMPLETED' && new Date(l.scheduledDate) < new Date())

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AnimatePresence>{toast && <motion.div initial={{ opacity:0,y:-20 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} style={{ position:'fixed',top:20,right:20,zIndex:9999,padding:'0.875rem 1.5rem',background:'rgba(16,185,129,0.15)',border:'1px solid var(--success)',borderRadius:12,color:'var(--text-main)',fontWeight:500,backdropFilter:'blur(12px)' }}>{toast}</motion.div>}</AnimatePresence>

      {overdue.length > 0 && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="glass-panel" style={{ padding:'1rem 1.5rem', marginBottom:'1rem', borderLeft:'4px solid var(--danger)', background:'rgba(239,68,68,0.06)' }}>
          ️ <strong>{overdue.length} overdue</strong> maintenance task{overdue.length > 1 ? 's' : ''} — {overdue.map(l => l.bus.plateNumber).join(', ')}
        </motion.div>
      )}

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h3 style={{ margin:0, fontSize:'1.3rem' }}>{t('maintenance.title')}</h3>
            <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginTop:4 }}>{logs.length} records</div>
          </div>
          <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }} className="btn btn-primary" onClick={() => setShowModal(true)}>+ Log Maintenance</motion.button>
        </div>

        <div style={{ display:'grid', gap:'0.75rem' }}>
          {logs.map(log => (
            <motion.div key={log.id} initial={{ opacity:0 }} animate={{ opacity:1 }} whileHover={{ scale:1.005 }}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem', background:'rgba(255,255,255,0.02)', borderRadius:12, border:`1px solid ${STATUS_COLOR[log.status]}33` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <div style={{ color: 'var(--text-dim)' }}>{TYPE_ICON[log.type] || <Settings size={18}/>}</div>
                <div>
                  <div style={{ fontWeight:600 }}>{log.bus.plateNumber} — {log.type.replace('_',' ')}</div>
                  <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>
                    {new Date(log.scheduledDate).toLocaleDateString()}
                    {log.description && ` · ${log.description}`}
                    {log.cost && ` · RM ${log.cost.toFixed(2)}`}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                <span className="badge" style={{ background:`${STATUS_COLOR[log.status]}22`, color:STATUS_COLOR[log.status], border:`1px solid ${STATUS_COLOR[log.status]}44` }}>
                  {log.status.replace('_',' ')}
                </span>
                {log.status !== 'COMPLETED' && (
                  <motion.button whileTap={{ scale:0.9 }} className="btn" onClick={() => updateStatus(log.id, 'COMPLETED')}
                    style={{ padding:'0.4rem 0.7rem', fontSize:'0.75rem', background:'rgba(16,185,129,0.1)', color:'var(--success)', border:'1px solid var(--success)' }}>
                    Complete
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
          {logs.length === 0 && <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>No maintenance records. Fleet is healthy! </div>}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
            <motion.div className="modal-box" initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}>
              <h3 style={{ marginBottom:'1.5rem' }}>{t('maintenance.logMaintenance')}</h3>
              <div style={{ display:'grid', gap:'1rem' }}>
                <select className="select-field" value={form.busId} onChange={e => setForm(p => ({...p, busId: e.target.value}))}>
                  <option value="">Select Bus</option>
                  {buses.map((b: Bus) => <option key={b.id} value={b.id}>{b.plateNumber}</option>)}
                </select>
                <select className="select-field" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                  {TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
                <input className="input-field" placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
                <input className="input-field" type="date" value={form.scheduledDate} onChange={e => setForm(p => ({...p, scheduledDate: e.target.value}))} />
                <input className="input-field" type="number" placeholder="Cost (RM)" value={form.cost} onChange={e => setForm(p => ({...p, cost: e.target.value}))} />
              </div>
              <div style={{ display:'flex', gap:'1rem', marginTop:'1.5rem' }}>
                <button className="btn" style={{ flex:1, background:'rgba(255,255,255,0.06)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <motion.button whileTap={{ scale:0.97 }} className="btn btn-primary" style={{ flex:2 }} onClick={handleSave}>Save</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
