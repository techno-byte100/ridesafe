'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, AlertTriangle, UserPlus, AlertCircle, Pencil, Trash2, 
  ShieldCheck, Bus, X, Key, Mail, LogOut, Check, Shield, Clock,
  CheckSquare, Square, Users, Building2
} from 'lucide-react'
import { useTranslation } from '@/i18n/provider'

interface User { 
  id: string
  name: string
  email: string
  role: string
  phone?: string
  lastLoginAt?: string | null
  buses?: { plateNumber: string }[]
  organizationId?: string 
}

interface Org { id: string; name: string }

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'badge-danger', SUPER_ADMIN: 'badge-danger', SCHOOL_ADMIN: 'badge-warning',
  DRIVER: 'badge-info', PARENT: 'badge-success'
}

const defaultForm = { name: '', email: '', password: '', phone: '', role: 'DRIVER', invoiceAmount: '150', organizationId: '' }

function sanitizePhone(v: string) {
  return v.replace(/[^0-9+\s()\-]/g, '')
}

function validateForm(form: typeof defaultForm, isEdit = false, t?: (k: string) => string): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.name.trim() || form.name.trim().length < 2) errs.name = t ? t('superAdmin.usersPage.validationName') : 'Name must be at least 2 characters'
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t ? t('superAdmin.usersPage.validationEmail') : 'Enter a valid email address'
  if (isEdit) {
    if (form.password && form.password.length < 6) errs.password = t ? t('superAdmin.usersPage.validationPassword') : 'Password must be at least 6 characters'
  } else if (!form.password || form.password.length < 6) {
    errs.password = t ? t('superAdmin.usersPage.validationPassword') : 'Password must be at least 6 characters'
  }
  if (form.phone && !/^[+0-9\s()\-]{7,20}$/.test(form.phone)) errs.phone = t ? t('superAdmin.usersPage.validationPhone') : 'Enter a valid phone number'
  return errs
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="input-group" style={{ marginBottom: 0 }}>
      <label className="input-label">{label}</label>
      {children}
      {error && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{error}</div>}
    </div>
  )
}

export default function SuperUsersTab({ searchQuery = '', currentUserRole = 'SUPER_ADMIN' }: { searchQuery?: string; currentUserRole?: string }) {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('ALL')
  const [filterOrg, setFilterOrg] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [invoicingId, setInvoicingId] = useState<string | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceUser, setInvoiceUser] = useState<User | null>(null)
  const [invoiceAmount, setInvoiceAmount] = useState('150')
  const [invoiceAmountErr, setInvoiceAmountErr] = useState('')
  const [orgs, setOrgs] = useState<Org[]>([])
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionRole, setBulkActionRole] = useState('')
  const [bulkActionOrg, setBulkActionOrg] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  const loadUsers = () => {
    setLoading(true)
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const loadOrgs = () => {
    fetch('/api/admin/organizations')
      .then(r => r.json())
      .then(d => setOrgs(d.organizations || []))
      .catch(() => {})
  }

  useEffect(() => { loadUsers(); loadOrgs() }, [])

  const q = searchQuery.toLowerCase().trim()
  const filtered = users.filter(u => {
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.includes(q))
    const matchRole = filterRole === 'ALL' || u.role === filterRole
    const matchOrg = filterOrg === 'ALL' || (filterOrg === '' ? !u.organizationId : u.organizationId === filterOrg)
    return matchQ && matchRole && matchOrg
  })

  const openAddModal = () => {
    setEditingUser(null)
    setForm(defaultForm)
    setFormErrors({})
    setShowModal(true)
  }

  const openEditModal = (u: User) => {
    setEditingUser(u)
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      phone: u.phone || '',
      role: u.role,
      invoiceAmount: '150',
      organizationId: u.organizationId || '',
    })
    setFormErrors({})
    setShowModal(true)
  }

  const handleSave = async () => {
    const errs = validateForm(form, Boolean(editingUser), t)
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    setSaving(true)
    try {
      let res: Response
      if (editingUser) {
        const body: Record<string, string | null> = {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          role: form.role,
          organizationId: form.organizationId || null
        }
        if (form.password) body.password = form.password
        res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      } else {
        res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            phone: form.phone || null,
            role: form.role,
            organizationId: form.organizationId || null
          })
        })
      }
      if (res.ok) {
        showToast(editingUser ? t('superAdmin.usersPage.toastUserUpdated') : t('superAdmin.usersPage.toastUserCreated'))
        setShowModal(false)
        setForm(defaultForm)
        setEditingUser(null)
        loadUsers()
      } else {
        const e = await res.json()
        showToast(e.error || (editingUser ? t('superAdmin.usersPage.toastUserFailedUpdate') : t('superAdmin.usersPage.toastUserFailedCreate')), 'error')
      }
    } catch {
      showToast(t('superAdmin.usersPage.toastNetworkError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (u: User) => {
    if (!confirm(t('superAdmin.usersPage.confirmDeleteUser', { name: u.name }))) return
    setDeletingId(u.id)
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast(t('superAdmin.usersPage.toastUserDeleted'))
        loadUsers()
      } else {
        const e = await res.json()
        showToast(e.error || t('superAdmin.usersPage.toastUserFailedDelete'), 'error')
      }
    } catch {
      showToast(t('superAdmin.usersPage.toastNetworkError'), 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const openInvoiceModal = (u: User) => {
    setInvoiceUser(u)
    setInvoiceAmount('150')
    setInvoiceAmountErr('')
    setShowInvoiceModal(true)
  }

  const handleGenerateInvoice = async () => {
    if (!invoiceUser) return
    const amt = parseFloat(invoiceAmount)
    if (isNaN(amt) || amt <= 0) {
      setInvoiceAmountErr('Enter a valid amount > 0')
      return
    }
    setInvoicingId(invoiceUser.id)
    try {
      const res = await fetch('/api/billing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: invoiceUser.id, amount: amt })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(t('superAdmin.usersPage.toastInvoiceGenerated'))
        setShowInvoiceModal(false)
      } else {
        showToast(data.error || t('superAdmin.usersPage.toastInvoiceFailed'), 'error')
      }
    } catch {
      showToast(t('superAdmin.usersPage.toastNetworkError'), 'error')
    } finally {
      setInvoicingId(null)
    }
  }

  const toggleSelectUser = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(u => u.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(t('superAdmin.usersPage.confirmBulkDelete', { count: selectedIds.size }))) return

    setBulkBusy(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedIds) })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(t('superAdmin.usersPage.toastBulkDeleted', { count: data.count }))
        loadUsers()
      } else {
        showToast(data.error || t('superAdmin.usersPage.toastBulkDeleteFailed'), 'error')
      }
    } catch {
      showToast(t('superAdmin.usersPage.toastBulkDeleteNetworkError'), 'error')
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkRoleChange = async () => {
    if (selectedIds.size === 0 || !bulkActionRole) return
    setBulkBusy(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedIds), role: bulkActionRole })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(t('superAdmin.usersPage.toastBulkRoleUpdated', { role: bulkActionRole, count: data.count }))
        setBulkActionRole('')
        loadUsers()
      } else {
        showToast(data.error || t('superAdmin.usersPage.toastBulkRoleFailed'), 'error')
      }
    } catch {
      showToast(t('superAdmin.usersPage.toastBulkRoleNetworkError'), 'error')
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkOrgChange = async () => {
    if (selectedIds.size === 0) return
    setBulkBusy(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedIds), organizationId: bulkActionOrg || null })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(t('superAdmin.usersPage.toastBulkOrgReassigned', { count: data.count }))
        setBulkActionOrg('')
        loadUsers()
      } else {
        showToast(data.error || t('superAdmin.usersPage.toastBulkOrgFailed'), 'error')
      }
    } catch {
      showToast(t('superAdmin.usersPage.toastBulkOrgNetworkError'), 'error')
    } finally {
      setBulkBusy(false)
    }
  }

  if (loading) return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 12, borderRadius: 10 }} />)}
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: toastType === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${toastType === 'success' ? 'var(--success)' : 'var(--danger)'}`, borderRadius: 12, color: 'var(--text-main)', fontWeight: 500 }}>
            {toastType === 'error' ? <AlertTriangle size={18} color="var(--danger)" /> : <CheckCircle size={18} color="var(--success)" />}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} color="var(--primary)" /> {t('superAdmin.usersPage.title')}
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {t('superAdmin.usersPage.subtitle', { count: users.length })}
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="btn btn-primary" onClick={openAddModal}>
            <UserPlus size={16} /> {t('superAdmin.usersPage.addUserBtn')}
          </motion.button>
        </div>

        <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="select-field" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
            <option value="ALL">{t('superAdmin.usersPage.filterAllRoles')}</option>
            {['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN', 'DRIVER', 'PARENT'].map(r => <option key={r} value={r}>{t(`superAdmin.roles.${r}`) || r}</option>)}
          </select>
          {currentUserRole === 'SUPER_ADMIN' && orgs.length > 0 && (
            <select className="select-field" value={filterOrg} onChange={e => setFilterOrg(e.target.value)} style={{ width: 'auto', minWidth: 180 }}>
              <option value="ALL">{t('superAdmin.usersPage.filterAllOrgs')}</option>
              <option value="">{t('superAdmin.usersPage.filterNoOrg')}</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}

          <button
            onClick={toggleSelectAll}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--surface-border)',
              borderRadius: 8, padding: '7px 14px', color: 'var(--text-main)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto'
            }}
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? (
              <><CheckSquare size={14} color="#FFD60A" /> {t('superAdmin.usersPage.deselectAllBtn')}</>
            ) : (
              <><Square size={14} /> {t('superAdmin.usersPage.selectAllBtn', { count: filtered.length })}</>
            )}
          </button>
        </div>

        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: '#1C1C21', border: '1px solid #FFD60A',
                borderRadius: 12, padding: '12px 18px', marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: '#FFD60A', color: '#08080A',
                  fontWeight: 800, fontSize: 12, padding: '2px 8px', borderRadius: 6
                }}>
                  {t('superAdmin.usersPage.selectedCount', { count: selectedIds.size })}
                </span>
                <span style={{ fontSize: 13, color: '#A6A6B2' }}>{t('superAdmin.usersPage.bulkOpsSub')}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <select
                    value={bulkActionRole}
                    onChange={e => setBulkActionRole(e.target.value)}
                    style={{
                      background: '#141417', color: '#FFF', border: '1px solid #3A3A43',
                      borderRadius: 8, padding: '6px 10px', fontSize: 12
                    }}
                  >
                    <option value="">{t('superAdmin.usersPage.changeRolePlaceholder')}</option>
                    <option value="DRIVER">{t('superAdmin.roles.DRIVER')}</option>
                    <option value="PARENT">{t('superAdmin.roles.PARENT')}</option>
                    <option value="ADMIN">{t('superAdmin.roles.ADMIN')}</option>
                    <option value="SCHOOL_ADMIN">{t('superAdmin.roles.SCHOOL_ADMIN')}</option>
                  </select>
                  <button
                    onClick={handleBulkRoleChange}
                    disabled={!bulkActionRole || bulkBusy}
                    style={{
                      background: '#0A84FF', color: '#FFF', border: 'none',
                      borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', opacity: !bulkActionRole || bulkBusy ? 0.5 : 1
                    }}
                  >
                    {t('superAdmin.usersPage.applyRoleBtn')}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <select
                    value={bulkActionOrg}
                    onChange={e => setBulkActionOrg(e.target.value)}
                    style={{
                      background: '#141417', color: '#FFF', border: '1px solid #3A3A43',
                      borderRadius: 8, padding: '6px 10px', fontSize: 12
                    }}
                  >
                    <option value="">{t('superAdmin.usersPage.reassignOrgPlaceholder')}</option>
                    <option value="">{t('superAdmin.usersPage.noOrgGlobal')}</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <button
                    onClick={handleBulkOrgChange}
                    disabled={bulkBusy}
                    style={{
                      background: '#30D158', color: '#08080A', border: 'none',
                      borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', opacity: bulkBusy ? 0.5 : 1
                    }}
                  >
                    {t('superAdmin.usersPage.assignOrgBtn')}
                  </button>
                </div>

                <button
                  onClick={handleBulkDelete}
                  disabled={bulkBusy}
                  style={{
                    background: '#FF453A', color: '#FFF', border: 'none',
                    borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    opacity: bulkBusy ? 0.5 : 1
                  }}
                >
                  <Trash2 size={13} /> {t('superAdmin.usersPage.deleteSelectedBtn')}
                </button>

                <button
                  onClick={() => setSelectedIds(new Set())}
                  style={{
                    background: 'transparent', color: '#A6A6B2', border: 'none',
                    fontSize: 12, cursor: 'pointer'
                  }}
                >
                  {t('superAdmin.usersPage.clearBtn')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[[t('superAdmin.usersPage.statsAdmins'), 'ADMIN', 'var(--danger)'], [t('superAdmin.usersPage.statsDrivers'), 'DRIVER', 'var(--info)'], [t('superAdmin.usersPage.statsParents'), 'PARENT', 'var(--success)']].map(([label, role, color]) => (
            <div key={label} className="glass-panel" style={{ padding: '0.75rem 1rem', textAlign: 'center', borderLeft: `3px solid ${color}` }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: color as string }}>{users.filter(u => u.role.includes(role as string)).length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {filtered.map(u => {
            const isSelected = selectedIds.has(u.id)
            return (
              <motion.div key={u.id} whileHover={{ backgroundColor: 'var(--surface-2)' }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.875rem 1.25rem', background: isSelected ? 'rgba(255,214,10,0.06)' : 'var(--surface)',
                  borderRadius: 10, border: isSelected ? '1px solid rgba(255,214,10,0.4)' : '1px solid var(--surface-border)'
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectUser(u.id)}
                    style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#FFD60A' }}
                  />

                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: u.role === 'DRIVER' ? 'var(--info-bg)' : u.role.includes('ADMIN') ? 'var(--danger-bg)' : 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: u.role === 'DRIVER' ? 'var(--info)' : u.role.includes('ADMIN') ? 'var(--danger)' : 'var(--success)', flexShrink: 0 }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                      <span>{u.email}</span>
                      {u.phone && <span>· 📞 {u.phone}</span>}
                      <span>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: u.lastLoginAt ? '#30D158' : '#6E6E7A' }}>
                        <Clock size={11} />
                        {u.lastLoginAt ? t('superAdmin.usersPage.activeStatus', { date: new Date(u.lastLoginAt).toLocaleDateString() }) : t('superAdmin.usersPage.neverLoggedIn')}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {u.role === 'PARENT' && (
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={() => openInvoiceModal(u)}
                      className="btn"
                      style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none' }}
                      disabled={invoicingId === u.id}
                    >
                      {t('superAdmin.usersPage.invoiceBtn')}
                    </motion.button>
                  )}
                  {u.buses && u.buses.length > 0 && (
                    <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Bus size={11} /> {u.buses.map(b => b.plateNumber).join(', ')}
                    </span>
                  )}
                  <span className={`badge ${ROLE_COLORS[u.role] || 'badge-pending'}`}>{t(`superAdmin.roles.${u.role}`) || u.role.replace('_', ' ')}</span>
                  <motion.button whileTap={{ scale: 0.92 }} onClick={() => openEditModal(u)}
                    title={t('superAdmin.usersPage.editUserTooltip')}
                    style={{ background: 'none', border: '1px solid var(--surface-border)', borderRadius: 8, padding: '4px 7px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    <Pencil size={13} />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleDelete(u)}
                    title={t('superAdmin.usersPage.deleteUserTooltip')} disabled={deletingId === u.id}
                    style={{ background: 'none', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 8, padding: '4px 7px', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}>
                    <Trash2 size={13} />
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>{q ? t('superAdmin.usersPage.noUsersMatch', { query: searchQuery }) : t('superAdmin.usersPage.noUsersFound')}</div>}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setFormErrors({}); setEditingUser(null) } }}>
            <motion.div className="modal-box" initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><UserPlus size={20} /> {editingUser ? t('superAdmin.usersPage.editModalTitle') : t('superAdmin.usersPage.addModalTitle')}</h3>
                <button onClick={() => { setShowModal(false); setFormErrors({}); setEditingUser(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Field label={t('superAdmin.usersPage.fullNameLabel')} error={formErrors.name}>
                  <input className="input-field" placeholder={t('superAdmin.usersPage.fullNamePlaceholder')} value={form.name}
                    minLength={2} maxLength={100}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    style={{ borderColor: formErrors.name ? 'var(--danger)' : undefined }}
                  />
                </Field>

                <Field label={t('superAdmin.usersPage.roleLabel')}>
                  <select className="select-field" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="DRIVER">{t('superAdmin.roles.DRIVER')}</option>
                    <option value="PARENT">{t('superAdmin.roles.PARENT')}</option>
                    <option value="ADMIN">{t('superAdmin.roles.ADMIN')}</option>
                    <option value="SCHOOL_ADMIN">{t('superAdmin.roles.SCHOOL_ADMIN')}</option>
                    {currentUserRole === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">{t('superAdmin.roles.SUPER_ADMIN')}</option>}
                  </select>
                </Field>

                <Field label={t('superAdmin.usersPage.orgLabel')}>
                  <select className="select-field" value={form.organizationId} onChange={e => setForm(p => ({ ...p, organizationId: e.target.value }))}>
                    <option value="">{t('superAdmin.usersPage.filterNoOrg')}</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </Field>

                <Field label={t('superAdmin.usersPage.emailLabel')} error={formErrors.email}>
                  <input type="email" className="input-field" placeholder={t('superAdmin.usersPage.emailPlaceholder')} value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    style={{ borderColor: formErrors.email ? 'var(--danger)' : undefined }}
                  />
                </Field>

                <Field label={t('superAdmin.usersPage.phoneLabel')} error={formErrors.phone}>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder={t('superAdmin.usersPage.phonePlaceholder')}
                    value={form.phone}
                    maxLength={20}
                    onChange={e => setForm(p => ({ ...p, phone: sanitizePhone(e.target.value) }))}
                    style={{ borderColor: formErrors.phone ? 'var(--danger)' : undefined }}
                  />
                </Field>

                <Field label={editingUser ? t('superAdmin.usersPage.passwordLabelNew') : t('superAdmin.usersPage.passwordLabel')} error={formErrors.password}>
                  <input type="password" className="input-field" placeholder={editingUser ? t('superAdmin.usersPage.passwordPlaceholderEdit') : t('superAdmin.usersPage.passwordPlaceholderAdd')} value={form.password}
                    minLength={editingUser ? undefined : 6} maxLength={128}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    style={{ borderColor: formErrors.password ? 'var(--danger)' : undefined }}
                  />
                </Field>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn" style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-main)' }}
                  onClick={() => { setShowModal(false); setFormErrors({}); setEditingUser(null) }}>{t('superAdmin.usersPage.cancelBtn')}</button>
                <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary" style={{ flex: 2 }}
                  onClick={handleSave} disabled={saving}>
                  {saving ? (editingUser ? t('superAdmin.usersPage.savingState') : t('superAdmin.usersPage.creatingState')) : (editingUser ? t('superAdmin.usersPage.saveChangesBtn') : t('superAdmin.usersPage.createUserBtn'))}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInvoiceModal && invoiceUser && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setShowInvoiceModal(false) }}>
            <motion.div className="modal-box" initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t('superAdmin.usersPage.invoiceModalTitle')}
                </h3>
                <button onClick={() => setShowInvoiceModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {t('superAdmin.usersPage.invoiceModalSub', { name: invoiceUser.name, email: invoiceUser.email })}
              </p>
              <Field label={t('superAdmin.usersPage.invoiceAmountLabel')} error={invoiceAmountErr}>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="99999"
                  className="input-field"
                  placeholder={t('superAdmin.usersPage.invoiceAmountPlaceholder')}
                  value={invoiceAmount}
                  onChange={e => {
                    setInvoiceAmount(e.target.value)
                    setInvoiceAmountErr('')
                  }}
                  style={{ borderColor: invoiceAmountErr ? 'var(--danger)' : undefined }}
                />
              </Field>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn" style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-main)' }}
                  onClick={() => setShowInvoiceModal(false)}>{t('superAdmin.usersPage.cancelBtn')}</button>
                <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary" style={{ flex: 2 }}
                  onClick={handleGenerateInvoice} disabled={invoicingId !== null}>
                  {invoicingId ? t('superAdmin.usersPage.generatingInvoiceState') : t('superAdmin.usersPage.confirmSendInvoiceBtn')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
