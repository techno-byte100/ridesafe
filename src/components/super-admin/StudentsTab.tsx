'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/i18n/provider'
import { 
  GraduationCap, Plus, Users, Bus, Route as RouteIcon, 
  CheckCircle, AlertCircle, Pencil, Trash2, Search, Filter, 
  Download, Clock, ShieldCheck, MapPin, X, ArrowRight, UserCheck
} from 'lucide-react'

interface StudentRecord {
  id: string
  name: string
  grade: string
  level: string
  parentContact1: string
  parentContact2?: string | null
  pickupTime?: string | null
  isSelfPickup: boolean
  selfPickupSession?: string | null
  status: string
  createdAt: string
  organizationId?: string | null
  organization?: { id: string; name: string } | null
  parentId?: string | null
  parent?: { id: string; name: string; email: string; phone?: string | null } | null
  routeId?: string | null
  route?: {
    id: string
    name: string
    buses?: {
      id: string
      plateNumber: string
      driver?: { id: string; name: string; phone?: string | null } | null
    }[]
  } | null
  pickupStopId?: string | null
  pickupStop?: { id: string; name: string } | null
  dropoffStopId?: string | null
  dropoffStop?: { id: string; name: string } | null
  attendances?: {
    id: string
    action: string
    timestamp: string
    parentConfirmedPickup: boolean
    parentConfirmedDropoff: boolean
  }[]
}

interface ParentUser {
  id: string
  name: string
  email: string
  phone?: string | null
}

interface RouteOption {
  id: string
  name: string
  buses?: {
    id: string
    plateNumber: string
    driver?: { id: string; name: string } | null
  }[]
  stops?: { id: string; name: string }[]
}

interface OrgOption {
  id: string
  name: string
}

const defaultStudentForm = {
  name: '',
  grade: 'Standard 1',
  level: 'Primary',
  parentContact1: '',
  parentContact2: '',
  organizationId: '',
  parentId: '',
  routeId: '',
  pickupStopId: '',
  dropoffStopId: '',
  pickupTime: '07:00 AM',
  isSelfPickup: false,
  selfPickupSession: 'MORNING',
  status: 'APPROVED'
}

export default function StudentsTab() {
  const { t } = useTranslation()
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [parents, setParents] = useState<ParentUser[]>([])
  const [routes, setRoutes] = useState<RouteOption[]>([])
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOrg, setFilterOrg] = useState('ALL')
  const [filterRoute, setFilterRoute] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
  const [form, setForm] = useState(defaultStudentForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Toast
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [studentsRes, usersRes, orgsRes, routesRes] = await Promise.all([
        fetch('/api/admin/students').then(r => r.ok ? r.json() : { students: [] }).catch(() => ({ students: [] })),
        fetch('/api/admin/users').then(r => r.ok ? r.json() : { users: [] }).catch(() => ({ users: [] })),
        fetch('/api/admin/organizations').then(r => r.ok ? r.json() : { organizations: [] }).catch(() => ({ organizations: [] })),
        fetch('/api/admin/routes').then(r => r.ok ? r.json() : { routes: [] }).catch(() => ({ routes: [] })),
      ])

      setStudents(studentsRes.students || [])
      setParents((usersRes.users || []).filter((u: any) => u.role === 'PARENT'))
      setOrgs(orgsRes.organizations || [])
      setRoutes(routesRes.routes || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const openAddModal = () => {
    setEditingStudent(null)
    setForm(defaultStudentForm)
    setShowModal(true)
  }

  const openEditModal = (s: StudentRecord) => {
    setEditingStudent(s)
    setForm({
      name: s.name,
      grade: s.grade,
      level: s.level,
      parentContact1: s.parentContact1,
      parentContact2: s.parentContact2 || '',
      organizationId: s.organizationId || '',
      parentId: s.parentId || '',
      routeId: s.routeId || '',
      pickupStopId: s.pickupStopId || '',
      dropoffStopId: s.dropoffStopId || '',
      pickupTime: s.pickupTime || '07:00 AM',
      isSelfPickup: s.isSelfPickup,
      selfPickupSession: s.selfPickupSession || 'MORNING',
      status: s.status || 'APPROVED'
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      showToast(t('superAdmin.studentsPage.validationName'), 'error')
      return
    }
    if (!form.parentContact1.trim()) {
      showToast(t('superAdmin.studentsPage.validationPhone'), 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...(editingStudent ? { id: editingStudent.id } : {}),
        name: form.name.trim(),
        grade: form.grade,
        level: form.level,
        parentContact1: form.parentContact1.trim(),
        parentContact2: form.parentContact2.trim() || null,
        organizationId: form.organizationId || null,
        parentId: form.parentId || null,
        routeId: form.routeId || null,
        pickupStopId: form.pickupStopId || null,
        dropoffStopId: form.dropoffStopId || null,
        pickupTime: form.pickupTime || null,
        isSelfPickup: form.isSelfPickup,
        selfPickupSession: form.selfPickupSession || null,
        status: form.status,
      }

      const res = await fetch('/api/admin/students', {
        method: editingStudent ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        showToast(editingStudent ? t('superAdmin.studentsPage.toastUpdated') : t('superAdmin.studentsPage.toastCreated'))
        setShowModal(false)
        setEditingStudent(null)
        setForm(defaultStudentForm)
        loadData()
      } else {
        const err = await res.json()
        showToast(err.error || t('superAdmin.studentsPage.toastFailedSave'), 'error')
      }
    } catch {
      showToast(t('superAdmin.studentsPage.toastNetworkSaveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s: StudentRecord) => {
    if (!confirm(t('superAdmin.studentsPage.confirmDelete', { name: s.name }))) return
    setDeletingId(s.id)
    try {
      const res = await fetch('/api/admin/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id })
      })
      if (res.ok) {
        showToast(t('superAdmin.studentsPage.toastDeleted', { name: s.name }))
        loadData()
      } else {
        const err = await res.json()
        showToast(err.error || t('superAdmin.studentsPage.toastFailedDelete'), 'error')
      }
    } catch {
      showToast(t('superAdmin.studentsPage.toastNetworkDeleteError'), 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const exportStudentsCSV = () => {
    const headers = ['ID', 'Name', 'Grade', 'Level', 'School', 'Parent Name', 'Parent Email', 'Parent Contact', 'Route', 'Bus Plate', 'Driver Name', 'Status']
    const rows = filteredStudents.map(s => {
      const bus = s.route?.buses?.[0]
      return [
        s.id,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        s.grade,
        s.level,
        `"${(s.organization?.name || 'Unassigned').replace(/"/g, '""')}"`,
        `"${(s.parent?.name || 'No Parent Linked').replace(/"/g, '""')}"`,
        `"${(s.parent?.email || '').replace(/"/g, '""')}"`,
        `"${(s.parentContact1 || '').replace(/"/g, '""')}"`,
        `"${(s.route?.name || 'Unassigned Route').replace(/"/g, '""')}"`,
        `"${(bus?.plateNumber || 'None').replace(/"/g, '""')}"`,
        `"${(bus?.driver?.name || 'Unassigned').replace(/"/g, '""')}"`,
        s.status,
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ridesafe_students_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showToast(t('superAdmin.studentsPage.toastExportedCsv'))
  }

  // Filtered List
  const q = searchQuery.trim().toLowerCase()
  const filteredStudents = students.filter(s => {
    const matchQ = !q || s.name.toLowerCase().includes(q) ||
      (s.parentContact1 && s.parentContact1.includes(q)) ||
      (s.parent?.name && s.parent.name.toLowerCase().includes(q))
    const matchOrg = filterOrg === 'ALL' || s.organizationId === filterOrg
    const matchRoute = filterRoute === 'ALL' || s.routeId === filterRoute
    const latestAction = s.attendances?.[0]?.action || 'PENDING'
    const matchStatus = filterStatus === 'ALL' || s.status === filterStatus || latestAction === filterStatus
    return matchQ && matchOrg && matchRoute && matchStatus
  })

  // Analytics Metrics
  const totalStudents = students.length
  const boardedToday = students.filter(s => s.attendances?.[0]?.action === 'PICKED_UP').length
  const droppedOffToday = students.filter(s => s.attendances?.[0]?.action === 'DROPPED_OFF').length
  const parentLinkedCount = students.filter(s => s.parentId).length
  const routeAssignedCount = students.filter(s => s.routeId).length

  if (loading) return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 70, marginBottom: 12, borderRadius: 10 }} />)}
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '0.875rem 1.5rem',
              background: toastType === 'success' ? '#30D158' : '#FF453A',
              color: '#000', fontWeight: 600, borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
            {toastType === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={{ background: '#141417', border: '1px solid #26262C', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A6A6B2', fontSize: 13 }}>
            <span>{t('superAdmin.studentsPage.totalEnrolledTitle')}</span>
            <GraduationCap size={18} color="#FFD60A" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#FFF', marginTop: 8 }}>{totalStudents}</div>
          <div style={{ fontSize: 12, color: '#6E6E7A', marginTop: 4 }}>{t('superAdmin.studentsPage.totalEnrolledSub')}</div>
        </div>

        <div style={{ background: '#141417', border: '1px solid #26262C', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A6A6B2', fontSize: 13 }}>
            <span>{t('superAdmin.studentsPage.activeOnboardTitle')}</span>
            <Bus size={18} color="#30D158" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#30D158', marginTop: 8 }}>{boardedToday}</div>
          <div style={{ fontSize: 12, color: '#6E6E7A', marginTop: 4 }}>{t('superAdmin.studentsPage.activeOnboardSub', { count: droppedOffToday })}</div>
        </div>

        <div style={{ background: '#141417', border: '1px solid #26262C', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A6A6B2', fontSize: 13 }}>
            <span>{t('superAdmin.studentsPage.parentLinkedTitle')}</span>
            <UserCheck size={18} color="#0A84FF" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#FFF', marginTop: 8 }}>
            {parentLinkedCount} <span style={{ fontSize: 14, color: '#A6A6B2' }}>/ {totalStudents}</span>
          </div>
          <div style={{ fontSize: 12, color: '#6E6E7A', marginTop: 4 }}>
            {t('superAdmin.studentsPage.parentLinkedSub', { pct: totalStudents > 0 ? Math.round((parentLinkedCount / totalStudents) * 100) : 0 })}
          </div>
        </div>

        <div style={{ background: '#141417', border: '1px solid #26262C', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A6A6B2', fontSize: 13 }}>
            <span>{t('superAdmin.studentsPage.routeAssignedTitle')}</span>
            <RouteIcon size={18} color="#BF5AF2" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#FFF', marginTop: 8 }}>
            {routeAssignedCount} <span style={{ fontSize: 14, color: '#A6A6B2' }}>/ {totalStudents}</span>
          </div>
          <div style={{ fontSize: 12, color: '#6E6E7A', marginTop: 4 }}>
            {t('superAdmin.studentsPage.routeAssignedSub', { count: totalStudents - routeAssignedCount })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ background: '#141417', border: '1px solid #26262C', borderRadius: 16, padding: 24 }}>
        {/* Header toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#FFF', display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={22} color="#FFD60A" /> {t('superAdmin.studentsPage.title')}
            </h3>
            <p style={{ margin: '4px 0 0', color: '#A6A6B2', fontSize: 13 }}>
              {t('superAdmin.studentsPage.subtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={exportStudentsCSV}
              style={{
                background: '#1C1C21', border: '1px solid #26262C', color: '#FFF',
                padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
              }}
            >
              <Download size={14} color="#0A84FF" /> {t('superAdmin.studentsPage.exportCsvBtn')}
            </button>
            <button
              onClick={openAddModal}
              style={{
                background: '#FFD60A', color: '#08080A', border: 'none',
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
              }}
            >
              <Plus size={16} /> {t('superAdmin.studentsPage.enrollBtn')}
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={16} color="#6E6E7A" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder={t('superAdmin.studentsPage.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8,
                background: '#0E0E11', border: '1px solid #26262C', color: '#FFF',
                fontSize: 13, outline: 'none'
              }}
            />
          </div>

          {orgs.length > 0 && (
            <select
              value={filterOrg}
              onChange={e => setFilterOrg(e.target.value)}
              style={{
                background: '#1C1C21', color: '#FFF', border: '1px solid #26262C',
                padding: '9px 12px', borderRadius: 8, fontSize: 13, outline: 'none'
              }}
            >
              <option value="ALL">{t('superAdmin.studentsPage.filterAllSchools')}</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}

          {routes.length > 0 && (
            <select
              value={filterRoute}
              onChange={e => setFilterRoute(e.target.value)}
              style={{
                background: '#1C1C21', color: '#FFF', border: '1px solid #26262C',
                padding: '9px 12px', borderRadius: 8, fontSize: 13, outline: 'none'
              }}
            >
              <option value="ALL">{t('superAdmin.studentsPage.filterAllRoutes')}</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
        </div>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#6E6E7A', fontSize: 14 }}>
            {searchQuery ? t('superAdmin.studentsPage.noStudentsFoundQuery', { query: searchQuery }) : t('superAdmin.studentsPage.noStudentsFound')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredStudents.map(student => {
              const latestAttendance = student.attendances?.[0]
              const assignedBus = student.route?.buses?.[0]
              const assignedDriver = assignedBus?.driver

              return (
                <div
                  key={student.id}
                  style={{
                    background: '#1C1C21', border: '1px solid #26262C',
                    borderRadius: 12, padding: '16px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: 16
                  }}
                >
                  {/* Student Info & School */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 220 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#FFD60A,#FF9F0A)',
                      color: '#08080A', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0
                    }}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#FFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {student.name}
                        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#26262C', color: '#A6A6B2' }}>
                          {student.grade} • {student.level}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#A6A6B2', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{t('superAdmin.studentsPage.schoolLabel')} <strong style={{ color: '#FFF' }}>{student.organization?.name || t('superAdmin.studentsPage.unassignedSchool')}</strong></span>
                        <span>•</span>
                        <span>{t('superAdmin.studentsPage.telLabel')} {student.parentContact1}</span>
                      </div>
                    </div>
                  </div>

                  {/* Parent Profile Mapping */}
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontSize: 11, color: '#6E6E7A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('superAdmin.studentsPage.parentProfileLabel')}</div>
                    {student.parent ? (
                      <div style={{ marginTop: 2 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#30D158' }}>{student.parent.name}</div>
                        <div style={{ fontSize: 11, color: '#A6A6B2' }}>{student.parent.email}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#FF9F0A', marginTop: 2 }}>{t('superAdmin.studentsPage.noParentLinked')}</div>
                    )}
                  </div>

                  {/* Route & Driver Context */}
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontSize: 11, color: '#6E6E7A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('superAdmin.studentsPage.busDriverAssignmentLabel')}</div>
                    {student.route ? (
                      <div style={{ marginTop: 2 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#FFF', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <RouteIcon size={13} color="#FFD60A" /> {student.route.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#A6A6B2' }}>
                          {assignedBus ? `${t('superAdmin.studentsPage.busPrefix')} ${assignedBus.plateNumber} (${t('superAdmin.studentsPage.driverPrefix')} ${assignedDriver?.name || t('superAdmin.studentsPage.assignedDriver')})` : t('superAdmin.studentsPage.noBusAssigned')}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#6E6E7A', marginTop: 2 }}>{t('superAdmin.studentsPage.unassignedRoute')}</div>
                    )}
                  </div>

                  {/* Boarding Status & Confirmation Flags */}
                  <div style={{ minWidth: 170 }}>
                    <div style={{ fontSize: 11, color: '#6E6E7A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('superAdmin.studentsPage.boardingAckLabel')}</div>
                    {latestAttendance ? (
                      <div style={{ marginTop: 4 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                          background: latestAttendance.action === 'PICKED_UP' ? 'rgba(48,209,88,0.15)' : 'rgba(10,132,255,0.15)',
                          color: latestAttendance.action === 'PICKED_UP' ? '#30D158' : '#0A84FF'
                        }}>
                          {latestAttendance.action === 'PICKED_UP' ? t('superAdmin.studentsPage.onBoardStatus') : t('superAdmin.studentsPage.droppedOffStatus')}
                        </span>
                        <div style={{ fontSize: 11, color: '#A6A6B2', marginTop: 4 }}>
                          {latestAttendance.parentConfirmedPickup || latestAttendance.parentConfirmedDropoff ? (
                            <span style={{ color: '#30D158', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <CheckCircle size={11} /> {t('superAdmin.studentsPage.parentConfirmed')}
                            </span>
                          ) : (
                            <span style={{ color: '#FF9F0A' }}>{t('superAdmin.studentsPage.awaitingParent')}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#6E6E7A', marginTop: 4 }}>{t('superAdmin.studentsPage.noTripToday')}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => openEditModal(student)}
                      title="Edit student & assignment"
                      style={{
                        background: 'transparent', border: '1px solid #3A3A43',
                        color: '#FFF', padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
                      }}
                    >
                      <Pencil size={13} /> {t('superAdmin.studentsPage.editBtn')}
                    </button>
                    <button
                      onClick={() => handleDelete(student)}
                      disabled={deletingId === student.id}
                      title="Delete student"
                      style={{
                        background: 'transparent', border: '1px solid rgba(255,69,58,0.3)',
                        color: '#FF453A', padding: '6px 8px', borderRadius: 8, cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Enroll / Edit Student Modal */}
      <AnimatePresence>
        {showModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
          }}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{
                background: '#141417', border: '1px solid #3A3A43',
                borderRadius: 16, padding: 24, maxWidth: 640, width: '100%',
                maxHeight: '90vh', overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#FFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GraduationCap size={20} color="#FFD60A" />
                  {editingStudent ? t('superAdmin.studentsPage.editModalTitle') : t('superAdmin.studentsPage.addModalTitle')}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#A6A6B2', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Name */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#FFF', marginBottom: 6 }}>
                    {t('superAdmin.studentsPage.nameLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('superAdmin.studentsPage.namePlaceholder')}
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      background: '#0E0E11', border: '1px solid #26262C', color: '#FFF', fontSize: 14
                    }}
                  />
                </div>

                {/* Grade & Level */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#FFF', marginBottom: 6 }}>
                      {t('superAdmin.studentsPage.gradeLabel')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('superAdmin.studentsPage.gradePlaceholder')}
                      value={form.grade}
                      onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        background: '#0E0E11', border: '1px solid #26262C', color: '#FFF', fontSize: 14
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#FFF', marginBottom: 6 }}>
                      {t('superAdmin.studentsPage.levelLabel')}
                    </label>
                    <select
                      value={form.level}
                      onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        background: '#0E0E11', border: '1px solid #26262C', color: '#FFF', fontSize: 14
                      }}
                    >
                      <option value="Kindergarten">{t('superAdmin.studentsPage.levelOptions.Kindergarten')}</option>
                      <option value="Primary">{t('superAdmin.studentsPage.levelOptions.Primary')}</option>
                      <option value="Secondary">{t('superAdmin.studentsPage.levelOptions.Secondary')}</option>
                    </select>
                  </div>
                </div>

                {/* Organization / School Tenant */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#FFF', marginBottom: 6 }}>
                    {t('superAdmin.studentsPage.schoolTenantLabel')}
                  </label>
                  <select
                    value={form.organizationId}
                    onChange={e => setForm(p => ({ ...p, organizationId: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      background: '#0E0E11', border: '1px solid #26262C', color: '#FFF', fontSize: 14
                    }}
                  >
                    <option value="">{t('superAdmin.studentsPage.noSchoolSelected')}</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>

                {/* Parent Profile Mapping */}
                <div style={{ background: '#1C1C21', padding: 14, borderRadius: 10, border: '1px solid #26262C' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#FFD60A', marginBottom: 6 }}>
                    {t('superAdmin.studentsPage.linkParentAccountLabel')}
                  </label>
                  <select
                    value={form.parentId}
                    onChange={e => {
                      const selParent = parents.find(p => p.id === e.target.value)
                      setForm(p => ({
                        ...p,
                        parentId: e.target.value,
                        parentContact1: selParent?.phone || p.parentContact1
                      }))
                    }}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      background: '#0E0E11', border: '1px solid #26262C', color: '#FFF', fontSize: 14, marginBottom: 10
                    }}
                  >
                    <option value="">{t('superAdmin.studentsPage.selectParentPlaceholder')}</option>
                    {parents.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email}){p.phone ? ` • ${p.phone}` : ''}
                      </option>
                    ))}
                  </select>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#A6A6B2', marginBottom: 4 }}>{t('superAdmin.studentsPage.primaryPhoneLabel')}</label>
                      <input
                        type="tel"
                        placeholder={t('superAdmin.studentsPage.phonePlaceholder1')}
                        value={form.parentContact1}
                        onChange={e => setForm(p => ({ ...p, parentContact1: e.target.value }))}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 8,
                          background: '#0E0E11', border: '1px solid #26262C', color: '#FFF', fontSize: 13
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#A6A6B2', marginBottom: 4 }}>{t('superAdmin.studentsPage.emergencyContact2Label')}</label>
                      <input
                        type="tel"
                        placeholder={t('superAdmin.studentsPage.phonePlaceholder2')}
                        value={form.parentContact2}
                        onChange={e => setForm(p => ({ ...p, parentContact2: e.target.value }))}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 8,
                          background: '#0E0E11', border: '1px solid #26262C', color: '#FFF', fontSize: 13
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Route & Stop Assignment */}
                <div style={{ background: '#1C1C21', padding: 14, borderRadius: 10, border: '1px solid #26262C' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0A84FF', marginBottom: 6 }}>
                    {t('superAdmin.studentsPage.assignBusRouteLabel')}
                  </label>
                  <select
                    value={form.routeId}
                    onChange={e => setForm(p => ({ ...p, routeId: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      background: '#0E0E11', border: '1px solid #26262C', color: '#FFF', fontSize: 14, marginBottom: 10
                    }}
                  >
                    <option value="">{t('superAdmin.studentsPage.selectRoutePlaceholder')}</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.buses?.[0] ? t('superAdmin.studentsPage.busPrefixParen', { plate: r.buses[0].plateNumber }) : ''}
                      </option>
                    ))}
                  </select>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#A6A6B2', marginBottom: 4 }}>{t('superAdmin.studentsPage.pickupTimeLabel')}</label>
                      <input
                        type="text"
                        placeholder={t('superAdmin.studentsPage.pickupTimePlaceholder')}
                        value={form.pickupTime}
                        onChange={e => setForm(p => ({ ...p, pickupTime: e.target.value }))}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 8,
                          background: '#0E0E11', border: '1px solid #26262C', color: '#FFF', fontSize: 13
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#A6A6B2', marginBottom: 4 }}>{t('superAdmin.studentsPage.regStatusLabel')}</label>
                      <select
                        value={form.status}
                        onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 8,
                          background: '#0E0E11', border: '1px solid #26262C', color: '#FFF', fontSize: 13
                        }}
                      >
                        <option value="APPROVED">{t('superAdmin.studentsPage.statusApproved')}</option>
                        <option value="PENDING">{t('superAdmin.studentsPage.statusPending')}</option>
                        <option value="INACTIVE">{t('superAdmin.studentsPage.statusInactive')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'transparent', border: '1px solid #3A3A43',
                    color: '#A6A6B2', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13
                  }}
                >
                  {t('superAdmin.studentsPage.cancelBtn')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: '#FFD60A', color: '#08080A', border: 'none',
                    padding: '10px 22px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13
                  }}
                >
                  {saving ? t('superAdmin.studentsPage.savingState') : editingStudent ? t('superAdmin.studentsPage.updateBtn') : t('superAdmin.studentsPage.enrollBtn')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
