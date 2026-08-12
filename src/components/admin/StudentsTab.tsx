'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertTriangle, UserPlus, Bus, Check, X, Download, Plus, Pencil, Trash2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Student {
  id: string; name: string; grade: string; level: string;
  parentContact1: string; parentContact2?: string;
  status: string; isSelfPickup: boolean; selfPickupSession?: string;
  busId?: string; bus?: { plateNumber: string }; routeId?: string;
  route?: { id: string; name: string }; parent?: { name: string }
}

interface Route { id: string; name: string }

const SELF_PICKUP_OPTIONS = [
  { value: '',              label: 'Bus Transport (no self-pickup)' },
  { value: 'MORNING',      label: 'Morning Self-Pickup' },
  { value: 'PM',           label: 'PM Self-Pickup' },
  { value: 'AFTER_SCHOOL', label: 'After School Activity' },
]

const defaultForm = {
  name: '', grade: '', level: '',
  parentContact1: '', parentContact2: '',
  selfPickupSession: '', routeId: '', parentId: ''
}

function sanitizePhone(v: string) {
  return v.replace(/[^0-9+\s()\-]/g, '')
}

function validateStudentForm(form: typeof defaultForm): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Student name must be at least 2 characters'
  if (!form.grade.trim()) errs.grade = 'Grade is required'
  if (!form.parentContact1.trim()) errs.parentContact1 = 'Primary contact is required'
  else if (!/^[+0-9\s()\-]{7,20}$/.test(form.parentContact1.trim())) errs.parentContact1 = 'Enter a valid phone number'
  if (form.parentContact2 && !/^[+0-9\s()\-]{7,20}$/.test(form.parentContact2.trim())) errs.parentContact2 = 'Enter a valid phone number'
  return errs
}

export default function StudentsTab({ searchQuery = '' }: { searchQuery?: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success'|'error'>('success')
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadStudents = () => {
    Promise.all([
      fetch('/api/students').then(r => r.json()),
      fetch('/api/admin/routes').then(r => r.json()),
    ]).then(([sData, rData]) => {
      setStudents(sData.students || [])
      setRoutes(rData.routes || [])
      setLoading(false)
    }).catch(console.error)
  }

  useEffect(() => { loadStudents() }, [])

  const showToast = (msg: string, type: 'success'|'error'='success') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3000)
  }

  const openAddModal = () => { setEditingStudent(null); setForm(defaultForm); setFormErrors({}); setShowModal(true) }

  const openEditModal = (s: Student) => {
    setEditingStudent(s)
    setForm({
      name: s.name, grade: s.grade, level: s.level || 'Primary',
      parentContact1: s.parentContact1, parentContact2: s.parentContact2 || '',
      selfPickupSession: s.selfPickupSession || '', routeId: s.routeId || s.route?.id || '', parentId: '',
    })
    setFormErrors({})
    setShowModal(true)
  }

  const handleSave = async () => {
    const errs = validateStudentForm(form)
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        grade: form.grade,
        level: form.level || 'Primary',
        parentContact1: form.parentContact1,
        parentContact2: form.parentContact2 || null,
        isSelfPickup: form.selfPickupSession !== '',
        selfPickupSession: form.selfPickupSession || null,
        routeId: form.routeId || null,
      }
      const res = editingStudent
        ? await fetch(`/api/students/${editingStudent.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        : await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
      if (res.ok) {
        showToast(editingStudent ? 'Student updated!' : 'Student added successfully!', 'success')
        setShowModal(false); setForm(defaultForm); setEditingStudent(null); loadStudents()
      } else {
        const e = await res.json(); showToast((e.error || 'Failed'), 'error')
      }
    } catch { showToast('Network error', 'error') } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s: Student) => {
    if (!confirm(`Remove "${s.name}" from the roster? This cannot be undone.`)) return
    setDeletingId(s.id)
    try {
      const res = await fetch(`/api/students/${s.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Student removed', 'success'); loadStudents()
      } else {
        const e = await res.json(); showToast(e.error || 'Failed to remove student', 'error')
      }
    } catch { showToast('Network error', 'error') } finally {
      setDeletingId(null)
    }
  }

  const exportCSV = () => {
    const rows = [
      ['#', 'Name', 'Grade', 'Level', 'Contact1', 'Status', 'Route'],
      ...students.map((s, i) => [i + 1, s.name, s.grade, s.level, s.parentContact1, s.status, s.route?.name || ''])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    showToast('CSV exported!', 'success')
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.setTextColor(40)
    doc.text('Student Roster — RideSafe', 14, 22)
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Total: ${students.length} students`, 14, 30)

    autoTable(doc, {
      startY: 38,
      head: [['#', 'Name', 'Grade', 'Level', 'Contact', 'Status', 'Route']],
      body: students.map((s, i) => [
        i + 1, s.name, s.grade, s.level, s.parentContact1,
        s.status.replace('_', ' '), s.route?.name || 'N/A'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    })

    doc.save(`students_${new Date().toISOString().split('T')[0]}.pdf`)
    showToast('PDF exported!', 'success')
  }

  const q = searchQuery.trim().toLowerCase()
  const filtered = q
    ? students.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q) ||
        s.level?.toLowerCase().includes(q) ||
        s.route?.name.toLowerCase().includes(q) ||
        s.parent?.name.toLowerCase().includes(q) ||
        s.parentContact1?.includes(q)
      )
    : students

  if (loading) return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      {[1,2,3,4].map(i => (
        <div key={i} className="skeleton" style={{ height: 60, marginBottom: 12, borderRadius: 10 }} />
      ))}
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
            style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'0.875rem 1.5rem', display:'flex', alignItems:'center', gap:'0.75rem',
              background: toastType === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${toastType === 'success' ? 'var(--success)' : 'var(--danger)'}`,
              borderRadius:12, color:'var(--text-main)', fontWeight:500, backdropFilter:'blur(12px)' }}>
            {toastType === 'error' ? <AlertTriangle size={18} color="var(--danger)"/> : <CheckCircle size={18} color="var(--success)"/>}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header row */}
      <div className="glass-panel" style={{ padding:'2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h3 style={{ margin:0, fontSize:'1.3rem' }}>Student Roster</h3>
            <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginTop:4 }}>{students.length} students enrolled</div>
          </div>
          <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
            <button className="btn" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--surface-border)', display:'flex', alignItems:'center', gap:6 }}
              onClick={exportCSV}>
              <Download size={16}/> Export CSV
            </button>
            <button className="btn" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--surface-border)', display:'flex', alignItems:'center', gap:6 }}
              onClick={exportPDF}>
              <Download size={16}/> Export PDF
            </button>
            <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
              className="btn btn-primary" onClick={openAddModal} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Plus size={16}/> Add Student
            </motion.button>
          </div>
        </div>

        {/* Students list */}
        <div style={{ display:'grid', gap:'0.75rem' }}>
          {filtered.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
              whileHover={{ scale:1.005, backgroundColor:'rgba(255,255,255,0.04)' }}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'1rem 1.25rem', background:'rgba(255,255,255,0.02)',
                borderRadius:12, border:'1px solid var(--surface-border)', transition:'all 0.2s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <div style={{ width:22, fontSize:'0.78rem', color:'var(--text-muted)', textAlign:'right', flexShrink:0, fontVariantNumeric:'tabular-nums' }}>
                  {i + 1}
                </div>
                <div style={{ width:40, height:40, borderRadius:'50%',
                  background:'linear-gradient(135deg,#FFD100,#F5A623)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:700, color:'#111', fontSize:'1rem', flexShrink:0 }}>
                  {s.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight:600 }}>{s.name}</div>
                  <div style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
                    {s.grade} · {s.level}
                    {s.parent && <span> · Parent: {s.parent.name}</span>}
                    {s.parentContact1 && <span> · 📞 {s.parentContact1}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end' }}>
                {s.route && <span className="badge badge-info">🚌 {s.route.name}</span>}
                {s.isSelfPickup ? (
                  <span style={{ color:'var(--info)', display:'flex', alignItems:'center', gap:4 }}>
                    <Check size={14}/>
                    {s.selfPickupSession === 'MORNING' ? 'Morning Pickup' : s.selfPickupSession === 'PM' ? 'PM Pickup' : s.selfPickupSession === 'AFTER_SCHOOL' ? 'After School' : 'Self Pickup'}
                  </span>
                ) : <span style={{ color:'var(--bus-yellow)', display:'flex', alignItems:'center', gap:4 }}><Bus size={14}/> {s.busId ? s.bus?.plateNumber : 'No Bus'}</span>}
                <span className={`badge ${s.status === 'CHECKED_OUT' ? 'badge-success' : 'badge-pending'}`}>
                  {s.status.replace('_',' ')}
                </span>
                <motion.button whileTap={{ scale:0.92 }} onClick={() => openEditModal(s)}
                  title="Edit student"
                  style={{ background:'none', border:'1px solid var(--surface-border)', borderRadius:8, padding:'4px 7px', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}>
                  <Pencil size={13} />
                </motion.button>
                <motion.button whileTap={{ scale:0.92 }} onClick={() => handleDelete(s)}
                  title="Remove student" disabled={deletingId === s.id}
                  style={{ background:'none', border:'1px solid rgba(255,69,58,0.3)', borderRadius:8, padding:'4px 7px', cursor:'pointer', color:'var(--danger)', display:'flex' }}>
                  <Trash2 size={13} />
                </motion.button>
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>
              {q ? `No students match "${searchQuery}".` : 'No students registered yet. Click "Add Student" to get started.'}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setEditingStudent(null) } }}>
            <motion.div className="modal-box" initial={{ opacity:0, scale:0.9, y:30 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
                <h3 style={{ margin:0, display:'flex', alignItems:'center', gap:8 }}><UserPlus size={20}/> {editingStudent ? 'Edit Student' : 'Register Student'}</h3>
                <button onClick={() => { setShowModal(false); setEditingStudent(null); setFormErrors({}) }} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:'1.5rem', cursor:'pointer' }}><X size={20}/></button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div className="input-group" style={{ gridColumn:'1/-1' }}>
                  <label className="input-label">Full Name *</label>
                  <input className="input-field" placeholder="Student full name" minLength={2} maxLength={100}
                    value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))}
                    style={{ borderColor: formErrors.name ? 'var(--danger)' : undefined }} />
                  {formErrors.name && <div style={{ color:'var(--danger)', fontSize:'0.75rem', marginTop:3 }}>{formErrors.name}</div>}
                </div>
                <div className="input-group">
                  <label className="input-label">Grade *</label>
                  <input className="input-field" placeholder="e.g. Grade 3" maxLength={20}
                    value={form.grade} onChange={e => setForm(p => ({...p, grade:e.target.value}))}
                    style={{ borderColor: formErrors.grade ? 'var(--danger)' : undefined }} />
                  {formErrors.grade && <div style={{ color:'var(--danger)', fontSize:'0.75rem', marginTop:3 }}>{formErrors.grade}</div>}
                </div>
                <div className="input-group">
                  <label className="input-label">Level</label>
                  <select className="select-field" value={form.level} onChange={e => setForm(p => ({...p, level:e.target.value}))}>
                    <option value="">Select level</option>
                    {['Nursery','KG','Primary','Middle','High'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                {/* type="tel" enforces numeric keyboard on mobile; sanitizePhone strips letters */}
                <div className="input-group">
                  <label className="input-label">Primary Contact *</label>
                  <input type="tel" className="input-field" placeholder="+60 12-345 6789" maxLength={20}
                    value={form.parentContact1} onChange={e => setForm(p => ({...p, parentContact1: sanitizePhone(e.target.value)}))}
                    style={{ borderColor: formErrors.parentContact1 ? 'var(--danger)' : undefined }} />
                  {formErrors.parentContact1 && <div style={{ color:'var(--danger)', fontSize:'0.75rem', marginTop:3 }}>{formErrors.parentContact1}</div>}
                </div>
                <div className="input-group">
                  <label className="input-label">Secondary Contact</label>
                  <input type="tel" className="input-field" placeholder="+60 12-345 6789" maxLength={20}
                    value={form.parentContact2} onChange={e => setForm(p => ({...p, parentContact2: sanitizePhone(e.target.value)}))}
                    style={{ borderColor: formErrors.parentContact2 ? 'var(--danger)' : undefined }} />
                  {formErrors.parentContact2 && <div style={{ color:'var(--danger)', fontSize:'0.75rem', marginTop:3 }}>{formErrors.parentContact2}</div>}
                </div>
                <div className="input-group" style={{ gridColumn:'1/-1' }}>
                  <label className="input-label">Assign Route</label>
                  <select className="select-field" value={form.routeId} onChange={e => setForm(p => ({...p, routeId:e.target.value}))}>
                    <option value="">No route (self-pickup)</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ gridColumn:'1/-1' }}>
                  <label className="input-label">Pickup Method</label>
                  <select className="select-field" value={form.selfPickupSession}
                    onChange={e => setForm(p => ({...p, selfPickupSession: e.target.value}))}>
                    {SELF_PICKUP_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display:'flex', gap:'1rem', marginTop:'1.5rem' }}>
                <button className="btn" style={{ flex:1, background:'rgba(255,255,255,0.06)' }} onClick={() => { setShowModal(false); setEditingStudent(null) }}>Cancel</button>
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                  className="btn btn-primary" style={{ flex:2 }}
                  onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : editingStudent ? '✓  Save Changes' : '✓  Save Student'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
