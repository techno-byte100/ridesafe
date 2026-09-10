'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Send, Bell, Users, CheckCircle, AlertTriangle, ShieldAlert, Info, Clock, Sparkles } from 'lucide-react'
import { useTranslation } from '@/i18n/provider'

interface Announcement {
  id: string
  title: string
  body: string
  targetRole: string
  type: string
  sentCount: number
  createdAt: string
}

const HC = {
  bg: '#08080A',
  bgSoft: '#0E0E11',
  surface: '#141417',
  surface2: '#1C1C21',
  line: '#26262C',
  lineStrong: '#3A3A43',
  text: '#FFFFFF',
  text2: '#A6A6B2',
  text3: '#6E6E7A',
  yellow: '#FFD60A',
  onYellow: '#08080A',
  danger: '#FF453A',
  r: '12px',
  pill: '9999px',
}

export default function SuperAdminAnnouncementsTab() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ title: '', body: '', targetRole: 'ALL', type: 'INFO' })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; targetRole: string } | null>(null)
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null)
  const [past, setPast] = useState<Announcement[]>([])
  const [loadingPast, setLoadingPast] = useState(true)

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 4000)
  }

  const loadPast = () => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then(d => {
        setPast(d.announcements || [])
        setLoadingPast(false)
      })
      .catch(() => setLoadingPast(false))
  }

  useEffect(() => {
    loadPast()
  }, [])

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      showToast('Title and message body are required', true)
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        showToast(`Announcement broadcasted to ${data.sent} recipient(s)!`)
        setForm({ title: '', body: '', targetRole: 'ALL', type: 'INFO' })
        loadPast()
      } else {
        showToast(data.error || 'Failed to send announcement', true)
      }
    } catch {
      showToast('Network error while broadcasting announcement', true)
    } finally {
      setSending(false)
    }
  }

  const roles = [
    { value: 'ALL', label: t('announcements.allUsers') || 'All Platform Users' },
    { value: 'PARENT', label: t('announcements.parentsOnly') || 'Parents Only' },
    { value: 'DRIVER', label: t('announcements.driversOnly') || 'Drivers Only' },
    { value: 'ADMIN', label: t('announcements.adminsOnly') || 'Admins Only' },
    { value: 'SCHOOL_ADMIN', label: 'School Admins Only' },
  ]

  const types = [
    { value: 'INFO', label: 'Information', icon: Info, color: '#30D158' },
    { value: 'WARNING', label: 'Warning', icon: AlertTriangle, color: '#FF9F0A' },
    { value: 'EMERGENCY', label: 'Emergency', icon: ShieldAlert, color: '#FF453A' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: 24,
              right: 24,
              zIndex: 9999,
              padding: '12px 20px',
              background: toast.isError ? 'rgba(255, 69, 58, 0.9)' : 'rgba(48, 209, 88, 0.95)',
              color: '#FFF',
              borderRadius: HC.r,
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            {toast.isError ? <ShieldAlert size={18} /> : <CheckCircle size={18} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header card */}
      <div
        style={{
          background: HC.surface,
          border: `1px solid ${HC.line}`,
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(255, 214, 10, 0.12)',
              border: `1px solid rgba(255, 214, 10, 0.25)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: HC.yellow
            }}
          >
            <Megaphone size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#FFF', margin: 0 }}>
              Global Broadcast Announcements
            </h2>
            <p style={{ fontSize: 13, color: HC.text2, margin: '4px 0 0' }}>
              Send platform-wide or targeted push notifications to all users across all schools
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: HC.pill,
              background: HC.surface2,
              border: `1px solid ${HC.line}`,
              color: HC.yellow,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Sparkles size={13} /> Master Dispatcher
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
        {/* Create Broadcast Form */}
        <div
          style={{
            background: HC.surface,
            border: `1px solid ${HC.line}`,
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          <div style={{ borderBottom: `1px solid ${HC.line}`, paddingBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Send size={18} style={{ color: HC.yellow }} /> Compose Broadcast
            </h3>
          </div>

          {/* Title input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: HC.text2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. System Maintenance Notice / Weather Alert"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: HC.bgSoft,
                border: `1px solid ${HC.line}`,
                borderRadius: 10,
                color: '#FFF',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
            />
          </div>

          {/* Message Textarea */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: HC.text2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Message
            </label>
            <textarea
              rows={4}
              placeholder="Type your broadcast message content..."
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: HC.bgSoft,
                border: `1px solid ${HC.line}`,
                borderRadius: 10,
                color: '#FFF',
                fontSize: 14,
                outline: 'none',
                resize: 'vertical',
                minHeight: 110,
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Target Audience */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: HC.text2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Target Audience
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {roles.map(r => {
                const active = form.targetRole === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, targetRole: r.value }))}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: active ? `1px solid ${HC.yellow}` : `1px solid ${HC.line}`,
                      background: active ? HC.yellow : HC.surface2,
                      color: active ? HC.onYellow : HC.text2,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priority Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: HC.text2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Priority Level
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {types.map(t => {
                const Icon = t.icon
                const active = form.type === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, type: t.value }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px 12px',
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: `1px solid ${active ? t.color : HC.line}`,
                      background: active ? `${t.color}22` : HC.surface2,
                      color: active ? t.color : HC.text2,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={15} />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Send Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSend}
            disabled={sending}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '14px',
              borderRadius: 10,
              background: HC.yellow,
              color: HC.onYellow,
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Send size={16} />
            {sending ? 'Broadcasting...' : 'Broadcast Announcement'}
          </motion.button>

          {/* Result Banner */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '12px 16px',
                background: 'rgba(48, 209, 88, 0.12)',
                borderRadius: 10,
                border: '1px solid rgba(48, 209, 88, 0.3)',
                color: '#30D158',
                fontSize: 13,
                textAlign: 'center',
                fontWeight: 600
              }}
            >
              Successfully sent notification to <strong>{result.sent}</strong> {result.targetRole === 'ALL' ? 'users' : result.targetRole.toLowerCase() + 's'}
            </motion.div>
          )}
        </div>

        {/* Past Broadcast History */}
        <div
          style={{
            background: HC.surface,
            border: `1px solid ${HC.line}`,
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          <div style={{ borderBottom: `1px solid ${HC.line}`, paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} style={{ color: HC.yellow }} /> Broadcast History
            </h3>
            <span style={{ fontSize: 12, color: HC.text3, fontWeight: 600 }}>{past.length} records</span>
          </div>

          {loadingPast ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 72, background: HC.surface2, borderRadius: 10, animation: 'pulse 1.5s infinite ease-in-out' }} />
              ))}
            </div>
          ) : past.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: HC.text3, fontSize: 13 }}>
              <Bell size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
              <p style={{ margin: 0 }}>No past announcements broadcasted yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
              {past.map(a => {
                const typeStyle = types.find(t => t.value === a.type) || types[0]
                const TypeIcon = typeStyle.icon
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: 16,
                      background: HC.surface2,
                      borderRadius: 12,
                      border: `1px solid ${HC.line}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#FFF' }}>{a.title}</span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: `${typeStyle.color}22`,
                          color: typeStyle.color,
                          border: `1px solid ${typeStyle.color}44`,
                          flexShrink: 0
                        }}
                      >
                        <TypeIcon size={11} /> {a.type}
                      </span>
                    </div>

                    <p style={{ fontSize: 13, color: HC.text2, margin: 0, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {a.body}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 11,
                        color: HC.text3,
                        marginTop: 4,
                        paddingTop: 8,
                        borderTop: `1px solid ${HC.line}`
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={12} /> Target: <strong style={{ color: HC.text2 }}>{a.targetRole}</strong> ({a.sentCount} recipients)
                      </span>
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
