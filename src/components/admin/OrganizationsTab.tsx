'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/i18n/provider'
import { Building2, Plus, Users2, GraduationCap, Bus, Route, X, CheckCircle, AlertCircle, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

interface Org {
  id: string
  name: string
  address?: string
  phone?: string
  isActive: boolean
  createdAt: string
  _count: { users: number; students: number; buses: number; routes: number }
}

const defaultForm = { name: '', address: '', phone: '' }

export default function OrganizationsTab() {
  const { t } = useTranslation()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Org | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success'|'error'>('success')

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  const load = () => {
    setLoading(true)
    fetch('/api/admin/organizations')
      .then(r => r.json())
      .then(d => { setOrgs(d.organizations || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAddModal = () => {
    setEditingOrg(null)
    setForm(defaultForm)
    setShowModal(true)
  }

  const openEditModal = (org: Org) => {
    setEditingOrg(org)
    setForm({ name: org.name, address: org.address || '', phone: org.phone || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      showToast('Organisation name must be at least 2 characters', 'error'); return
    }
    if (form.address && !form.address.trim()) {
      showToast('Address cannot be only spaces', 'error'); return
    }
    if (form.phone) {
      if (!form.phone.trim()) { showToast('Phone number cannot be only spaces', 'error'); return }
      if (!/^[+0-9\s()-]{7,20}$/.test(form.phone.trim())) { showToast('Enter a valid phone number', 'error'); return }
    }
    setSaving(true)
    try {
      let res: Response
      if (editingOrg) {
        // Edit existing org
        res = await fetch('/api/admin/organizations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingOrg.id, ...form })
        })
      } else {
        // Create new org
        res = await fetch('/api/admin/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
      }
      if (res.ok) {
        showToast(editingOrg ? 'Organisation updated!' : 'Organisation created!')
        setShowModal(false); setForm(defaultForm); setEditingOrg(null); load()
      } else {
        const e = await res.json()
        showToast(e.error || (editingOrg ? 'Failed to update' : 'Failed to create'), 'error')
      }
    } catch { showToast('Network error', 'error') }
    finally { setSaving(false) }
  }

  const handleToggleActive = async (org: Org) => {
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: org.id, isActive: !org.isActive })
      })
      if (res.ok) {
        showToast(`Organisation ${!org.isActive ? 'activated' : 'deactivated'}`)
        load()
      } else {
        showToast('Failed to update status', 'error')
      }
    } catch { showToast('Network error', 'error') }
  }

  const handleDelete = async (org: Org) => {
    if (!confirm(`Delete "${org.name}"? This cannot be undone.`)) return
    setDeleting(org.id)
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: org.id })
      })
      if (res.ok) {
        showToast('Organisation deleted')
        load()
      } else {
        const e = await res.json()
        showToast(e.error || 'Failed to delete', 'error')
      }
    } catch { showToast('Network error', 'error') }
    finally { setDeleting(null) }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
            style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'0.875rem 1.5rem',
              background: toastType === 'success' ? 'rgba(47,209,107,0.15)' : 'rgba(255,69,58,0.15)',
              border: `1px solid ${toastType === 'success' ? 'var(--success)' : 'var(--danger)'}`,
              borderRadius:12, color:'var(--text-main)', fontWeight:600, backdropFilter:'blur(12px)',
              display:'flex', alignItems:'center', gap:8 }}>
            {toastType === 'success' ? <CheckCircle size={16} color="var(--success)" /> : <AlertCircle size={16} color="var(--danger)" />}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h3 style={{ margin:0, fontSize:'1.25rem', display:'flex', alignItems:'center', gap:8 }}>
              <Building2 size={20} color="var(--primary)" /> Manage Organisations
            </h3>
            <div style={{ fontSize:'0.83rem', color:'var(--text-muted)', marginTop:4 }}>
              {orgs.length} organisation{orgs.length !== 1 ? 's' : ''} registered · Super Admin view
            </div>
          </div>
          <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
            className="btn btn-primary" onClick={openAddModal}
            style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={16} /> Add Organisation
          </motion.button>
        </div>
      </div>

      {/* Org cards grid */}
      {orgs.length === 0 ? (
        <div className="glass-panel" style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)' }}>
          <Building2 size={40} style={{ opacity:0.25, marginBottom:'1rem' }} />
          <div style={{ fontWeight:600, marginBottom:4 }}>No organisations yet</div>
          <div style={{ fontSize:'0.85rem' }}>Click "Add Organisation" to create the first one.</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:'1.25rem' }}>
          {orgs.map(org => (
            <motion.div key={org.id} layout initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
              className="glass-panel" style={{ padding:'1.5rem', borderLeft:`3px solid ${org.isActive ? 'var(--success)' : 'var(--text-muted)'}` }}>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight:700, fontSize:'1.05rem', color:'var(--text-main)', wordBreak:'break-word' }}>{org.name}</div>
                  {org.address && <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:2 }}>{org.address}</div>}
                  {org.phone && <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{org.phone}</div>}
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0, marginLeft:8 }}>
                  <span className={`badge ${org.isActive ? 'badge-success' : 'badge-pending'}`}>
                    {org.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <motion.button whileTap={{ scale:0.92 }} onClick={() => openEditModal(org)}
                    title="Edit organisation"
                    style={{ background:'none', border:'1px solid var(--surface-border)', borderRadius:8, padding:'4px 7px', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}>
                    <Pencil size={13} />
                  </motion.button>
                  <motion.button whileTap={{ scale:0.92 }} onClick={() => handleToggleActive(org)}
                    title={org.isActive ? 'Deactivate' : 'Activate'}
                    style={{ background:'none', border:'1px solid var(--surface-border)', borderRadius:8, padding:'4px 7px', cursor:'pointer', color: org.isActive ? 'var(--success)' : 'var(--text-muted)', display:'flex' }}>
                    {org.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                  </motion.button>
                  <motion.button whileTap={{ scale:0.92 }} onClick={() => handleDelete(org)}
                    title="Delete organisation"
                    disabled={deleting === org.id}
                    style={{ background:'none', border:'1px solid rgba(255,69,58,0.3)', borderRadius:8, padding:'4px 7px', cursor:'pointer', color:'var(--danger)', display:'flex' }}>
                    <Trash2 size={13} />
                  </motion.button>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.5rem', marginTop:'0.75rem' }}>
                {[
                  { icon: <Users2 size={14}/>,       label: 'Users',    val: org._count.users },
                  { icon: <GraduationCap size={14}/>, label: 'Students', val: org._count.students },
                  { icon: <Bus size={14}/>,           label: 'Buses',    val: org._count.buses },
                  { icon: <Route size={14}/>,         label: 'Routes',   val: org._count.routes },
                ].map(({ icon, label, val }) => (
                  <div key={label} style={{ textAlign:'center', padding:'0.5rem', borderRadius:8, background:'var(--surface-2)' }}>
                    <div style={{ color:'var(--text-muted)', display:'flex', justifyContent:'center', marginBottom:2 }}>{icon}</div>
                    <div style={{ fontWeight:800, fontSize:'1rem', color:'var(--text-main)' }}>{val}</div>
                    <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop:'0.75rem', fontSize:'0.73rem', color:'var(--text-muted)' }}>
                Created {new Date(org.createdAt).toLocaleDateString('en-MY', { dateStyle:'medium' })}
                {' · '}ID: <span style={{ fontFamily:'monospace', fontSize:'0.68rem' }}>{org.id.slice(0,12)}…</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Org Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setEditingOrg(null) } }}>
            <motion.div className="modal-box" initial={{ opacity:0, scale:0.92, y:24 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.92 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
                <h3 style={{ margin:0, display:'flex', alignItems:'center', gap:8 }}>
                  <Building2 size={20} /> {editingOrg ? 'Edit Organisation' : 'Add Organisation'}
                </h3>
                <button onClick={() => { setShowModal(false); setEditingOrg(null) }} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="input-group">
                <label className="input-label">Organisation Name *</label>
                <input className="input-field" placeholder="e.g. SK Taman Maju" value={form.name}
                  onChange={e => setForm(p => ({...p, name: e.target.value}))} />
              </div>
              <div className="input-group">
                <label className="input-label">Address</label>
                <input className="input-field" placeholder="Full address" value={form.address}
                  onChange={e => setForm(p => ({...p, address: e.target.value}))} />
              </div>
              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <input type="tel" className="input-field" placeholder="+60 3-1234 5678" value={form.phone} maxLength={20}
                  onChange={e => setForm(p => ({...p, phone: e.target.value.replace(/[^0-9+\s()\-]/g, '')}))} />
              </div>

              <div style={{ display:'flex', gap:'1rem', marginTop:'1.5rem' }}>
                <button className="btn" style={{ flex:1, background:'var(--surface-2)', border:'1px solid var(--surface-border)', color:'var(--text-main)' }}
                  onClick={() => { setShowModal(false); setEditingOrg(null) }}>Cancel</button>
                <motion.button whileTap={{ scale:0.97 }} className="btn btn-primary" style={{ flex:2 }}
                  onClick={handleSave} disabled={saving}>
                  {saving ? (editingOrg ? 'Saving…' : 'Creating…') : (editingOrg ? '✓ Save Changes' : 'Create Organisation')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
