'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/i18n/provider'
import { 
  Building2, Plus, Users2, GraduationCap, Bus, Route, X, 
  CheckCircle, AlertCircle, Pencil, Trash2, ToggleLeft, ToggleRight,
  Shield, Award, Sparkles, HardDrive
} from 'lucide-react'

interface Org {
  id: string
  name: string
  address?: string
  phone?: string
  isActive: boolean
  subscriptionTier: 'FREE' | 'BASIC' | 'PREMIUM' | string
  maxBuses: number
  maxStudents: number
  maxUsers: number
  createdAt: string
  _count: { users: number; students: number; buses: number; routes: number }
}

interface FormState {
  name: string
  address: string
  phone: string
  subscriptionTier: string
  maxBuses: number
  maxStudents: number
  maxUsers: number
}

const defaultForm: FormState = {
  name: '',
  address: '',
  phone: '',
  subscriptionTier: 'FREE',
  maxBuses: 5,
  maxStudents: 100,
  maxUsers: 20
}

export default function OrganizationsTab() {
  const { t } = useTranslation()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Org | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg)
    setToastType(type)
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
    setForm({
      name: org.name,
      address: org.address || '',
      phone: org.phone || '',
      subscriptionTier: org.subscriptionTier || 'FREE',
      maxBuses: org.maxBuses || 5,
      maxStudents: org.maxStudents || 100,
      maxUsers: org.maxUsers || 20,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      showToast(t('superAdmin.orgsPage.validationName'), 'error')
      return
    }
    if (form.address && !form.address.trim()) {
      showToast(t('superAdmin.orgsPage.validationAddress'), 'error')
      return
    }
    if (form.phone) {
      if (!form.phone.trim()) { showToast(t('superAdmin.orgsPage.validationPhoneSpaces'), 'error'); return }
      if (!/^[+0-9\s()-]{7,20}$/.test(form.phone.trim())) { showToast(t('superAdmin.orgsPage.validationPhoneInvalid'), 'error'); return }
    }
    setSaving(true)
    try {
      let res: Response
      if (editingOrg) {
        res = await fetch('/api/admin/organizations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingOrg.id, ...form })
        })
      } else {
        res = await fetch('/api/admin/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
      }
      if (res.ok) {
        showToast(editingOrg ? t('superAdmin.orgsPage.toastUpdated') : t('superAdmin.orgsPage.toastCreated'))
        setShowModal(false)
        setForm(defaultForm)
        setEditingOrg(null)
        load()
      } else {
        const e = await res.json()
        showToast(e.error || (editingOrg ? t('superAdmin.orgsPage.toastFailedUpdate') : t('superAdmin.orgsPage.toastFailedCreate')), 'error')
      }
    } catch {
      showToast(t('superAdmin.orgsPage.toastNetworkError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (org: Org) => {
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: org.id, isActive: !org.isActive })
      })
      if (res.ok) {
        showToast(!org.isActive ? t('superAdmin.orgsPage.toastActivated') : t('superAdmin.orgsPage.toastDeactivated'))
        load()
      } else {
        showToast(t('superAdmin.orgsPage.toastStatusFailed'), 'error')
      }
    } catch {
      showToast(t('superAdmin.orgsPage.toastNetworkError'), 'error')
    }
  }

  const handleDelete = async (org: Org) => {
    if (!confirm(t('superAdmin.orgsPage.confirmDelete', { name: org.name }))) return
    setDeleting(org.id)
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: org.id })
      })
      if (res.ok) {
        showToast(t('superAdmin.orgsPage.toastDeleted'))
        load()
      } else {
        const e = await res.json()
        showToast(e.error || t('superAdmin.orgsPage.toastDeleteFailed'), 'error')
      }
    } catch {
      showToast(t('superAdmin.orgsPage.toastNetworkError'), 'error')
    } finally {
      setDeleting(null)
    }
  }

  const getTierBadge = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'PREMIUM':
        return { label: t('superAdmin.tiers.PREMIUM'), bg: 'rgba(255,214,10,0.15)', text: '#FFD60A', border: 'rgba(255,214,10,0.3)' }
      case 'BASIC':
        return { label: t('superAdmin.tiers.BASIC'), bg: 'rgba(10,132,255,0.15)', text: '#0A84FF', border: 'rgba(10,132,255,0.3)' }
      default:
        return { label: t('superAdmin.tiers.FREE'), bg: 'rgba(255,255,255,0.08)', text: '#A6A6B2', border: 'rgba(255,255,255,0.15)' }
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '0.875rem 1.5rem',
              background: toastType === 'success' ? 'rgba(47,209,107,0.15)' : 'rgba(255,69,58,0.15)',
              border: `1px solid ${toastType === 'success' ? 'var(--success)' : 'var(--danger)'}`,
              borderRadius: 12, color: 'var(--text-main)', fontWeight: 600, backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
            {toastType === 'success' ? <CheckCircle size={16} color="var(--success)" /> : <AlertCircle size={16} color="var(--danger)" />}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={20} color="var(--primary)" /> {t('superAdmin.orgsPage.title')}
            </h3>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {t('superAdmin.orgsPage.countSubtitle', { count: orgs.length })}
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="btn btn-primary" onClick={openAddModal}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> {t('superAdmin.orgsPage.addBtn')}
          </motion.button>
        </div>
      </div>

      {/* Org cards grid */}
      {orgs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Building2 size={40} style={{ opacity: 0.25, marginBottom: '1rem' }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('superAdmin.orgsPage.noOrgsTitle')}</div>
          <div style={{ fontSize: '0.85rem' }}>{t('superAdmin.orgsPage.noOrgsSub')}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px,1fr))', gap: '1.25rem' }}>
          {orgs.map(org => {
            const tierBadge = getTierBadge(org.subscriptionTier || 'FREE')
            const busQuotaPct = Math.min(100, Math.round(((org._count?.buses || 0) / (org.maxBuses || 5)) * 100))
            const studentQuotaPct = Math.min(100, Math.round(((org._count?.students || 0) / (org.maxStudents || 100)) * 100))

            return (
              <motion.div key={org.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="glass-panel" style={{ padding: '1.5rem', borderLeft: `3px solid ${org.isActive ? 'var(--success)' : 'var(--text-muted)'}` }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                        {org.name}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
                        background: tierBadge.bg, color: tierBadge.text, border: `1px solid ${tierBadge.border}`
                      }}>
                        {tierBadge.label}
                      </span>
                    </div>
                    {org.address && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{org.address}</div>}
                    {org.phone && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{org.phone}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
                    <span className={`badge ${org.isActive ? 'badge-success' : 'badge-pending'}`}>
                      {org.isActive ? t('superAdmin.orgsPage.statusActive') : t('superAdmin.orgsPage.statusInactive')}
                    </span>
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => openEditModal(org)}
                      title="Edit organisation"
                      style={{ background: 'none', border: '1px solid var(--surface-border)', borderRadius: 8, padding: '4px 7px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                      <Pencil size={13} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleToggleActive(org)}
                      title={org.isActive ? 'Deactivate' : 'Activate'}
                      style={{ background: 'none', border: '1px solid var(--surface-border)', borderRadius: 8, padding: '4px 7px', cursor: 'pointer', color: org.isActive ? 'var(--success)' : 'var(--text-muted)', display: 'flex' }}>
                      {org.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleDelete(org)}
                      title="Delete organisation"
                      disabled={deleting === org.id}
                      style={{ background: 'none', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 8, padding: '4px 7px', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}>
                      <Trash2 size={13} />
                    </motion.button>
                  </div>
                </div>

                {/* Quota Progress Mini-Bars */}
                <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 8, marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                      <span>{t('superAdmin.orgsPage.busesQuotaLabel')}</span>
                      <span>{org._count?.buses || 0} / {org.maxBuses || 5} ({busQuotaPct}%)</span>
                    </div>
                    <div style={{ height: 4, width: '100%', background: '#26262C', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${busQuotaPct}%`, background: busQuotaPct > 90 ? '#FF453A' : '#FFD60A', borderRadius: 2 }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                      <span>{t('superAdmin.orgsPage.studentsCapacityLabel')}</span>
                      <span>{org._count?.students || 0} / {org.maxStudents || 100} ({studentQuotaPct}%)</span>
                    </div>
                    <div style={{ height: 4, width: '100%', background: '#26262C', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${studentQuotaPct}%`, background: studentQuotaPct > 90 ? '#FF453A' : '#0A84FF', borderRadius: 2 }} />
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {[
                    { icon: <Users2 size={14} />, label: t('superAdmin.orgsPage.statUsers'), val: org._count?.users || 0 },
                    { icon: <GraduationCap size={14} />, label: t('superAdmin.orgsPage.statStudents'), val: org._count?.students || 0 },
                    { icon: <Bus size={14} />, label: t('superAdmin.orgsPage.statBuses'), val: org._count?.buses || 0 },
                    { icon: <Route size={14} />, label: t('superAdmin.orgsPage.statRoutes'), val: org._count?.routes || 0 },
                  ].map(({ icon, label, val }) => (
                    <div key={label} style={{ textAlign: 'center', padding: '0.5rem', borderRadius: 8, background: 'var(--surface-2)' }}>
                      <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', marginBottom: 2 }}>{icon}</div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{val}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '0.75rem', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                  {t('superAdmin.orgsPage.createdPrefix')} {new Date(org.createdAt).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                  {' · '}ID: <span style={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>{org.id.slice(0, 12)}…</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Org Modal with Tiers & Quotas */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setEditingOrg(null) } }}>
            <motion.div className="modal-box" initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={20} /> {editingOrg ? t('superAdmin.orgsPage.editModalTitle') : t('superAdmin.orgsPage.addModalTitle')}
                </h3>
                <button onClick={() => { setShowModal(false); setEditingOrg(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="input-group">
                <label className="input-label">{t('superAdmin.orgsPage.nameLabel')}</label>
                <input className="input-field" placeholder={t('superAdmin.orgsPage.namePlaceholder')} value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">{t('superAdmin.orgsPage.addressLabel')}</label>
                <input className="input-field" placeholder={t('superAdmin.orgsPage.addressPlaceholder')} value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">{t('superAdmin.orgsPage.phoneLabel')}</label>
                <input type="tel" className="input-field" placeholder={t('superAdmin.orgsPage.phonePlaceholder')} value={form.phone} maxLength={20}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/[^0-9+\s()\-]/g, '') }))} />
              </div>

              {/* Subscription Tier Selection */}
              <div className="input-group">
                <label className="input-label">{t('superAdmin.orgsPage.tierLabel')}</label>
                <select
                  className="input-field"
                  value={form.subscriptionTier}
                  onChange={e => setForm(p => ({ ...p, subscriptionTier: e.target.value }))}
                  style={{ background: 'var(--surface-2)', color: 'var(--text-main)' }}
                >
                  <option value="FREE">{t('superAdmin.orgsPage.tierOptions.FREE')}</option>
                  <option value="BASIC">{t('superAdmin.orgsPage.tierOptions.BASIC')}</option>
                  <option value="PREMIUM">{t('superAdmin.orgsPage.tierOptions.PREMIUM')}</option>
                </select>
              </div>

              {/* Resource Quotas Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontSize: 11 }}>{t('superAdmin.orgsPage.maxBusesLabel')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.maxBuses}
                    onChange={e => setForm(p => ({ ...p, maxBuses: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontSize: 11 }}>{t('superAdmin.orgsPage.maxStudentsLabel')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.maxStudents}
                    onChange={e => setForm(p => ({ ...p, maxStudents: parseInt(e.target.value) || 10 }))}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontSize: 11 }}>{t('superAdmin.orgsPage.maxUsersLabel')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.maxUsers}
                    onChange={e => setForm(p => ({ ...p, maxUsers: parseInt(e.target.value) || 5 }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn" style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-main)' }}
                  onClick={() => { setShowModal(false); setEditingOrg(null) }}>{t('superAdmin.orgsPage.cancelBtn')}</button>
                <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary" style={{ flex: 2 }}
                  onClick={handleSave} disabled={saving}>
                  {saving ? (editingOrg ? t('superAdmin.orgsPage.savingState') : t('superAdmin.orgsPage.creatingState')) : (editingOrg ? t('superAdmin.orgsPage.saveChangesBtn') : t('superAdmin.orgsPage.createBtn'))}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
