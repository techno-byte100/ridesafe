'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AnnouncementsTab() {
  const [form, setForm] = useState({ title: '', body: '', targetRole: 'ALL', type: 'INFO' })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; targetRole: string } | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 4000) }

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) { showToast('️ Title and message required'); return }
    setSending(true)
    try {
      const res = await fetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        showToast(`Sent to ${data.sent} users!`)
        setForm({ title: '', body: '', targetRole: 'ALL', type: 'INFO' })
      } else showToast('' + data.error)
    } catch { showToast('Network error') }
    finally { setSending(false) }
  }

  const roles = [
    { value: 'ALL', label: 'All Users' },
    { value: 'PARENT', label: '‍‍Parents Only' },
    { value: 'DRIVER', label: 'Drivers Only' },
    { value: 'ADMIN', label: '️ Admins Only' },
  ]
  const types = [
    { value: 'INFO', label: 'ℹ️ Info', color: '#3B82F6' },
    { value: 'WARNING', label: '️ Warning', color: '#F59E0B' },
    { value: 'EMERGENCY', label: 'Emergency', color: '#EF4444' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AnimatePresence>{toast && <motion.div initial={{ opacity:0,y:-20 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} style={{ position:'fixed',top:20,right:20,zIndex:9999,padding:'0.875rem 1.5rem',background:'rgba(16,185,129,0.15)',border:'1px solid var(--success)',borderRadius:12,color:'var(--text-main)',fontWeight:500,backdropFilter:'blur(12px)' }}>{toast}</motion.div>}</AnimatePresence>

      <div className="glass-panel" style={{ padding: '2rem', maxWidth: 700 }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Broadcast Announcement</h3>

        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {/* Title */}
          <div className="input-group">
            <label className="input-label">Title</label>
            <input className="input-field" placeholder="e.g., School Holiday Notice" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
          </div>

          {/* Message */}
          <div className="input-group">
            <label className="input-label">Message</label>
            <textarea className="input-field" rows={4} placeholder="Type your announcement..." value={form.body} onChange={e => setForm(p => ({...p, body: e.target.value}))} style={{ resize: 'vertical', minHeight: 100 }} />
          </div>

          {/* Target Audience */}
          <div className="input-group">
            <label className="input-label">Target Audience</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {roles.map(r => (
                <button key={r.value} onClick={() => setForm(p => ({...p, targetRole: r.value}))} className="btn"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', background: form.targetRole === r.value ? 'var(--primary)' : 'rgba(255,255,255,0.06)', color: form.targetRole === r.value ? '#fff' : 'var(--text-muted)', border: form.targetRole === r.value ? 'none' : '1px solid var(--surface-border)' }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="input-group">
            <label className="input-label">Priority</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {types.map(t => (
                <button key={t.value} onClick={() => setForm(p => ({...p, type: t.value}))} className="btn"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', background: form.type === t.value ? `${t.color}22` : 'rgba(255,255,255,0.06)', color: form.type === t.value ? t.color : 'var(--text-muted)', border: `1px solid ${form.type === t.value ? t.color : 'var(--surface-border)'}` }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', fontWeight: 700 }}
            onClick={handleSend} disabled={sending}>
            {sending ? 'Sending...' : 'Send Announcement'}
          </motion.button>
        </div>

        {result && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ marginTop:'1.5rem', padding:'1rem', background:'rgba(16,185,129,0.06)', borderRadius:12, border:'1px solid var(--success)', textAlign:'center' }}>
            Successfully sent to <strong>{result.sent}</strong> {result.targetRole === 'ALL' ? 'users' : result.targetRole.toLowerCase() + 's'}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
