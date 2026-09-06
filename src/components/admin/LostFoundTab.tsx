'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CheckCircle, FolderClosed, Sparkles } from 'lucide-react'
import { useTranslation } from '@/i18n/provider'

interface LostItem {
  id: string; description: string; status: string; photoUrl?: string; createdAt: string
  reporter: { name: string; role: string }
}

const STATUS_COLOR: Record<string, string> = { OPEN: '#F59E0B', FOUND: '#10B981', CLOSED: '#6B7280' }
const STATUS_ICON: Record<string, React.ReactNode> = { OPEN: <Search size={18}/>, FOUND: <CheckCircle size={18}/>, CLOSED: <FolderClosed size={18}/> }

export default function LostFoundTab() {
  const { t } = useTranslation()
  const [items, setItems] = useState<LostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [description, setDescription] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const reload = () => { fetch('/api/lost-found').then(r => r.json()).then(d => { setItems(d.items || []); setLoading(false) }) }
  useEffect(() => { reload() }, [])

  const handleReport = async () => {
    if (!description.trim()) { showToast('️ Description required'); return }
    const res = await fetch('/api/lost-found', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }) })
    if (res.ok) { showToast('Report submitted!'); setShowModal(false); setDescription(''); reload() }
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/lost-found', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    reload()
  }

  if (loading) return <div className="glass-panel" style={{ padding:'2rem' }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:50, marginBottom:12, borderRadius:10 }} />)}</div>

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <AnimatePresence>{toast && <motion.div initial={{ opacity:0,y:-20 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} style={{ position:'fixed',top:20,right:20,zIndex:9999,padding:'0.875rem 1.5rem',background:'rgba(16,185,129,0.15)',border:'1px solid var(--success)',borderRadius:12,color:'var(--text-main)',fontWeight:500,backdropFilter:'blur(12px)' }}>{toast}</motion.div>}</AnimatePresence>

      <div className="glass-panel" style={{ padding:'2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h3 style={{ margin:0, fontSize:'1.3rem' }}>{t('lostFound.title')}</h3>
            <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginTop:4 }}>{items.filter(i => i.status === 'OPEN').length} open reports</div>
          </div>
          <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }} className="btn btn-primary" onClick={() => setShowModal(true)}>+ Report Item</motion.button>
        </div>

        <div style={{ display:'grid', gap:'0.75rem' }}>
          {items.map(item => (
            <motion.div key={item.id} initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem', background:'rgba(255,255,255,0.02)', borderRadius:12, border:`1px solid ${STATUS_COLOR[item.status]}33` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <div style={{ fontSize:'1.5rem' }}>{STATUS_ICON[item.status]}</div>
                <div>
                  <div style={{ fontWeight:600 }}>{item.description}</div>
                  <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>
                    Reported by {item.reporter.name} · {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                <span className="badge" style={{ background:`${STATUS_COLOR[item.status]}22`, color:STATUS_COLOR[item.status] }}>{item.status}</span>
                {item.status === 'OPEN' && (
                  <motion.button whileTap={{ scale:0.9 }} className="btn" onClick={() => updateStatus(item.id, 'FOUND')}
                    style={{ padding:'0.4rem 0.7rem', fontSize:'0.75rem', background:'rgba(16,185,129,0.1)', color:'var(--success)' }}>
                    Mark Found
                  </motion.button>
                )}
                {item.status === 'FOUND' && (
                  <motion.button whileTap={{ scale:0.9 }} className="btn" onClick={() => updateStatus(item.id, 'CLOSED')}
                    style={{ padding:'0.4rem 0.7rem', fontSize:'0.75rem', background:'rgba(107,114,128,0.1)', color:'#6B7280' }}>
                    Close
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
          {items.length === 0 && <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'3rem', color:'var(--text-muted)' }}><Sparkles size={32} style={{marginBottom: '1rem'}}/>No reports yet — that&apos;s great!</div>}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
            <motion.div className="modal-box" initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}>
              <h3 style={{ marginBottom:'1.5rem' }}>{t('lostFound.reportItem')}</h3>
              <textarea className="input-field" rows={4} placeholder="Describe the lost item (e.g., blue water bottle, left on Bus WKA1234)..." value={description} onChange={e => setDescription(e.target.value)} style={{ resize:'vertical', minHeight:100 }} />
              <div style={{ display:'flex', gap:'1rem', marginTop:'1.5rem' }}>
                <button className="btn" style={{ flex:1, background:'rgba(255,255,255,0.06)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <motion.button whileTap={{ scale:0.97 }} className="btn btn-primary" style={{ flex:2 }} onClick={handleReport}>Submit Report</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
