'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/i18n/provider'
import { CheckCircle, AlertTriangle, MessageSquarePlus, Mails, Send, X } from 'lucide-react'

interface Message {
  id: string
  content: string
  createdAt: string
  read: boolean
  sender: { id: string; name: string; role: string }
  recipient: { id: string; name: string; role: string }
}
interface User { id: string; name: string; role: string }

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'var(--danger)',
  SUPER_ADMIN: 'var(--danger)',
  DRIVER: 'var(--info)',
  PARENT: 'var(--success)',
  SCHOOL_ADMIN: 'var(--warning)',
}
const ROLE_BG: Record<string, string> = {
  ADMIN: 'var(--danger-bg)',
  SUPER_ADMIN: 'var(--danger-bg)',
  DRIVER: 'var(--info-bg)',
  PARENT: 'var(--success-bg)',
  SCHOOL_ADMIN: 'var(--warning-bg)',
}

const MAX_CHARS = 1000

export default function MessagesTab() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [recipientId, setRecipientId] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const listEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = async () => {
    try {
      const [msgRes, userRes] = await Promise.all([
        fetch('/api/messages'),
        fetch('/api/admin/users'),
      ])
      const [msgData, userData] = await Promise.all([msgRes.json(), userRes.json()])
      setMessages(msgData.messages || [])
      setUsers((userData.users || []).filter((u: User) => !['ADMIN', 'SUPER_ADMIN'].includes(u.role)))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMessages() }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3000)
  }

  // Mark a message as read when clicked
  const markRead = async (msg: Message) => {
    if (msg.read) return
    try {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id }),
      })
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
    } catch { /* silent */ }
  }

  const handleSend = async () => {
    if (!recipientId) { showToast('Please select a recipient', 'error'); return }
    if (!content.trim()) { showToast('Message cannot be empty', 'error'); return }
    if (content.trim().length > MAX_CHARS) { showToast(`Message too long (max ${MAX_CHARS} characters)`, 'error'); return }

    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, content: content.trim() }),
      })
      if (res.ok) {
        showToast('Message sent!')
        setShowCompose(false)
        setContent('')
        setRecipientId('')
        await loadMessages()
      } else {
        const e = await res.json()
        showToast(e.error || 'Failed to send', 'error')
      }
    } catch { showToast('Network error', 'error') }
    finally { setSending(false) }
  }

  const handleCloseCompose = () => {
    setShowCompose(false)
    setContent('')
    setRecipientId('')
  }

  const unreadCount = messages.filter(m => !m.read).length

  if (loading) return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12, borderRadius: 10 }} />)}
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: toastType === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${toastType === 'success' ? 'var(--success)' : 'var(--danger)'}`, borderRadius: 12, color: 'var(--text-main)', fontWeight: 500 }}
          >
            {toastType === 'error' ? <AlertTriangle size={18} color="var(--danger)" /> : <CheckCircle size={18} color="var(--success)" />}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Admin Inbox
              {unreadCount > 0 && (
                <span style={{ background: 'var(--danger)', color: 'white', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', minWidth: 20, textAlign: 'center' }}>
                  {unreadCount}
                </span>
              )}
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {unreadCount > 0 ? `${unreadCount} unread · ` : ''}{messages.length} total messages
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="btn btn-primary"
            onClick={() => setShowCompose(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <MessageSquarePlus size={18} /> Compose
          </motion.button>
        </div>

        {/* Message list */}
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Mails size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No messages yet</div>
            <div style={{ fontSize: '0.85rem' }}>Compose a message to a driver or parent.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => markRead(msg)}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 10,
                  border: `1px solid ${msg.read ? 'var(--surface-border)' : 'rgba(30,58,138,0.25)'}`,
                  background: msg.read ? 'var(--surface)' : 'rgba(30,58,138,0.04)',
                  cursor: msg.read ? 'default' : 'pointer',
                  borderLeft: `4px solid ${ROLE_COLOR[msg.sender.role] || 'var(--primary)'}`,
                  transition: 'all 0.15s',
                }}
              >
                {/* Message header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: ROLE_BG[msg.sender.role] || 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, color: ROLE_COLOR[msg.sender.role] || 'var(--primary)',
                      fontSize: '0.95rem', flexShrink: 0,
                    }}>
                      {msg.sender.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {msg.sender.name}
                        <span className={`badge ${msg.sender.role === 'DRIVER' ? 'badge-info' : msg.sender.role === 'PARENT' ? 'badge-success' : 'badge-warning'}`} style={{ marginLeft: 8, fontSize: '0.65rem' }}>
                          {msg.sender.role}
                        </span>
                        {!msg.read && (
                          <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: '0.62rem' }}>NEW</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
                        → {msg.recipient.name}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(msg.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>

                {/* Message body — use text-main so it's visible on light background */}
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6, paddingLeft: '0.25rem' }}>
                  {msg.content}
                </p>
              </motion.div>
            ))}
            <div ref={listEndRef} />
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) handleCloseCompose() }}
          >
            <motion.div
              className="modal-box"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              style={{ maxWidth: 500 }}
            >
              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquarePlus size={20} /> New Message
                </h3>
                <button onClick={handleCloseCompose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Recipient */}
              <div className="input-group">
                <label className="input-label">Send To *</label>
                {users.length === 0 ? (
                  <div style={{ padding: '0.75rem', background: 'var(--warning-bg)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--warning)' }}>
                    No drivers or parents registered yet.
                  </div>
                ) : (
                  <select
                    className="select-field"
                    value={recipientId}
                    onChange={e => setRecipientId(e.target.value)}
                  >
                    <option value="">Select recipient…</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.role}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Message body */}
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                  <label className="input-label" style={{ margin: 0 }}>Message *</label>
                  <span style={{ fontSize: '0.72rem', color: content.length > MAX_CHARS ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {content.length}/{MAX_CHARS}
                  </span>
                </div>
                <textarea
                  className="input-field"
                  rows={5}
                  placeholder="Type your message here…"
                  value={content}
                  maxLength={MAX_CHARS}
                  onChange={e => setContent(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, minHeight: 120 }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  className="btn"
                  style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-main)' }}
                  onClick={handleCloseCompose}
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="btn btn-primary"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={handleSend}
                  disabled={sending || !recipientId || !content.trim()}
                >
                  {sending ? 'Sending…' : <><Send size={16} /> Send Message</>}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
