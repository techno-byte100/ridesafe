'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import '../parent.css'

// ── Types ─────────────────────────────────────────────────────────────────────
interface StopInfo {
  id: string
  name: string
  latitude: number
  longitude: number
}

interface StudentData {
  id: string
  name: string
  grade: string
  level: string
  status: string // BOARDING_TODAY, ABSENT_TODAY, CHECKED_OUT, PENDING, etc.
  photoUrl?: string
  pickupTime?: string
  parentContact1: string
  parentContact2?: string
  isSelfPickup: boolean
  pickupStop?: StopInfo
  dropoffStop?: StopInfo
  route?: { id: string; name: string; morningTime?: string; afternoonTime?: string }
}

interface DriverData {
  id: string
  name: string
  phone?: string
  lastLatitude: number | null
  lastLongitude: number | null
  lastLocationUpdate?: string
  currentSpeedKmH?: number
  distanceKm?: number
  etaMins?: number
  isNear?: boolean
}

interface NotifData {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  createdAt: string
}

interface MessageData {
  id: string
  content: string
  read: boolean
  createdAt: string
  sender: { name: string }
}

interface PaymentRecord {
  id: string
  amount: number
  status: string
  dueDate?: string | null
  paidAt?: string | null
  createdAt: string
  bukkuInvoiceId?: string | null
}

const BusMap = dynamic(() => import('@/components/shared/BusMap'), { ssr: false })

import { useAudio } from '@/hooks/useAudio'
import { useTranslation } from '@/i18n/provider'
import CalendarCard from '@/components/parent/CalendarCard'
import {
  LayoutDashboard,
  MapPin,
  ClipboardCheck,
  CreditCard,
  MessageSquare,
  User,
  Bell,
  Bus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Calendar,
  Sparkles,
  ShieldCheck,
  Flame,
  Target,
  LogOut,
  ChevronRight,
  HelpCircle,
  Globe,
  DollarSign,
  DownloadCloud,
  Check,
  X,
  Navigation,
  CheckCircle
} from 'lucide-react'

// ── Gamification Badges ──────────────────────────────────────────────────────
const BADGES = [
  { id: 'first_check', icon: <Target size={16}/>, label: 'First Check-in', xp: 50 },
  { id: 'week_streak', icon: <Flame size={16}/>, label: '5-Day Streak', xp: 100 },
  { id: 'safe_rider', icon: <ShieldCheck size={16}/>, label: 'Safe Rider', xp: 75 },
  { id: 'early_bird', icon: <Clock size={16}/>, label: 'Early Bird', xp: 60 },
]
function getXP(notifs: NotifData[]): number { return Math.min(notifs.length * 25, 500) }
function getLevel(xp: number): number { return Math.floor(xp / 100) + 1 }
function getLevelLabel(lvl: number): string {
  return ['', 'Rookie', 'Regular', 'Reliable', 'Champion', 'Legend'][Math.min(lvl, 5)] || 'Legend'
}

export default function ParentDashboard() {
  const { locale, setLocale, t } = useTranslation()
  const router = useRouter()

  // Primary data states
  const [students, setStudents] = useState<StudentData[]>([])
  const [drivers, setDrivers] = useState<DriverData[]>([])
  const [notifications, setNotifications] = useState<NotifData[]>([])
  const [messages, setMessages] = useState<MessageData[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [schoolName, setSchoolName] = useState('RideSafe School')
  const [loading, setLoading] = useState(true)

  // Navigation tab: HOME, TRACKING, ATTENDANCE, PAYMENTS, MESSAGES, PROFILE
  const [activeTab, setActiveTab] = useState<'HOME' | 'TRACKING' | 'ATTENDANCE' | 'PAYMENTS' | 'MESSAGES' | 'PROFILE'>('HOME')

  // Proximity drop-off & pickup alert banner state
  const [proximityAlert, setProximityAlert] = useState<{
    visible: boolean
    stopName: string
    isDropoff: boolean
    etaMins: number | null
  }>({ visible: false, stopName: '', isDropoff: false, etaMins: null })

  const proximityTriggeredRef = useRef(false)
  const prevDriverLatRef = useRef<number | null>(null)

  // Active trip state
  const [activeTrip, setActiveTrip] = useState<{ id: string; delayMinutes?: number; delayReason?: string; routeName?: string } | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [transitUpdating, setTransitUpdating] = useState<string | null>(null)

  // Payment states
  const [payingInvoice, setPayingInvoice] = useState<PaymentRecord | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentToast, setPaymentToast] = useState<string | null>(null)

  // Messages state
  const [msgContent, setMsgContent] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgToast, setMsgToast] = useState('')

  // User Profile
  const [me, setMe] = useState<{ id?: string; name: string; email: string; phone?: string } | null>(null)
  const [profileNotice, setProfileNotice] = useState('')
  const [profilePanel, setProfilePanel] = useState<'INFO' | 'HELP' | null>(null)

  // Audio Alerts
  const { play: playAlert } = useAudio('/alert toon.mp3')
  const { play: playHorn } = useAudio('/bus-horn.mp3')

  // Gamification calculations
  const xp = getXP(notifications)
  const level = getLevel(xp)
  const xpInLevel = xp % 100
  const earnedBadges = BADGES.slice(0, Math.min(level, BADGES.length))

  // ── Proximity Check (Pickup & Drop-off) ──────────────────────────────────────
  const checkProximity = useCallback((driversData: DriverData[], studentsData: StudentData[]) => {
    if (studentsData.length === 0) return
    const activeDriver = driversData.find(d => d.lastLatitude && d.lastLongitude) || driversData[0]
    if (!activeDriver?.lastLatitude || !activeDriver?.lastLongitude) return

    for (const student of studentsData) {
      // Check dropoff stop first, then pickup stop
      const targetStop = student.dropoffStop || student.pickupStop
      if (!targetStop?.latitude || !targetStop?.longitude) continue

      const R = 6371 // Earth's radius in km
      const dLat = (targetStop.latitude - activeDriver.lastLatitude) * (Math.PI / 180)
      const dLon = (targetStop.longitude - activeDriver.lastLongitude) * (Math.PI / 180)
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(activeDriver.lastLatitude * (Math.PI / 180)) *
          Math.cos(targetStop.latitude * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      const THRESHOLD_KM = 0.6 // 600 meters proximity zone
      if (distKm <= THRESHOLD_KM) {
        if (!proximityTriggeredRef.current) {
          proximityTriggeredRef.current = true
          const etaMins =
            activeDriver.currentSpeedKmH && activeDriver.currentSpeedKmH > 0
              ? Math.max(1, Math.round((distKm / activeDriver.currentSpeedKmH) * 60))
              : 2

          const isDropoff = Boolean(student.dropoffStop)
          setProximityAlert({
            visible: true,
            stopName: targetStop.name,
            isDropoff,
            etaMins,
          })
          playAlert()

          // System browser notification if granted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(isDropoff ? '🚏 Bus Arriving Near Drop-off!' : '🚌 Bus Approaching Pickup!', {
                body: isDropoff
                  ? `Bus is near ${targetStop.name}! Please be ready to receive ${student.name} from the drop-off area.`
                  : `Bus is approaching ${targetStop.name}! Get ready for pickup.`,
                icon: '/favicon.ico'
              })
            } catch { /* silent */ }
          }
        }
        return // Break on first matching stop
      } else if (proximityTriggeredRef.current && distKm > THRESHOLD_KM + 0.3) {
        proximityTriggeredRef.current = false
      }
    }
  }, [playAlert])

  // ── Fetch Invoices for Parent ───────────────────────────────────────────────
  const fetchPayments = useCallback(async (parentId: string) => {
    try {
      const res = await fetch(`/api/billing/${parentId}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
      }
    } catch { /* silent */ }
  }, [])

  // ── Initial Data Load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const loadInitialData = async () => {
      try {
        const [studentsRes, locationRes, notifRes, msgRes, meRes] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/location'),
          fetch('/api/notifications'),
          fetch('/api/messages'),
          fetch('/api/auth/me'),
        ])

        if (studentsRes.status === 401) { router.push('/'); return }

        const studentsData = await studentsRes.json()
        const locationData = await locationRes.json()
        const notificationsData = await notifRes.json()
        const msgData = await msgRes.json()

        let currentParentId: string | null = null
        if (meRes.ok) {
          const meData = await meRes.json()
          if (meData.user) {
            setMe(meData.user)
            currentParentId = meData.user.id
            fetchPayments(meData.user.id)
          }
        }

        const currentStudents = studentsData.students || []
        setStudents(currentStudents)
        const driversData = locationData.drivers || []
        setDrivers(driversData)
        checkProximity(driversData, currentStudents)

        setNotifications(notificationsData.notifications || [])
        setMessages(msgData.messages || [])

        // Active Trip Check
        try {
          const tripRes = await fetch('/api/trips/active')
          if (tripRes.ok) {
            const tripData = await tripRes.json()
            if (tripData.trip) setActiveTrip(tripData.trip)
          }
        } catch { /* silent */ }

        // Fetch School Setting
        fetch('/api/admin/settings').then(r => r.json()).then(d => {
          if (d.schoolName) setSchoolName(d.schoolName)
        }).catch(() => {})

      } catch (e) {
        console.error('Data load error:', e)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()

    // Background interval for messages and notifications
    const interval = setInterval(async () => {
      try {
        const [notifRes, msgRes] = await Promise.all([
          fetch('/api/notifications'),
          fetch('/api/messages'),
        ])
        if (notifRes.ok) {
          const nd = await notifRes.json()
          setNotifications(nd.notifications || [])
        }
        if (msgRes.ok) {
          const md = await msgRes.json()
          setMessages(md.messages || [])
        }
      } catch { /* silent */ }
    }, 12000)

    // SSE Realtime location stream
    const evtSource = new EventSource('/api/location/stream')
    evtSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data)
        setDrivers(prev => {
          const exists = prev.some(d => d.id === update.id)
          const updated = exists ? prev.map(d => d.id === update.id ? { ...d, ...update } : d) : [...prev, update]
          return updated
        })
      } catch { /* silent */ }
    }

    return () => {
      clearInterval(interval)
      evtSource.close()
    }
  }, [router, checkProximity, fetchPayments])

  // Re-run proximity on driver or student updates
  useEffect(() => {
    if (drivers.length > 0 && students.length > 0) {
      checkProximity(drivers, students)
    }
  }, [drivers, students, checkProximity])

  // ── Handlers ────────────────────────────────────────────────────────────────

  // 1. Daily Transit Acknowledgement
  const handleTransitAcknowledgement = async (studentId: string, status: 'BOARDING_TODAY' | 'ABSENT_TODAY') => {
    setTransitUpdating(studentId)
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, status })
      })
      if (res.ok) {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s))
        playHorn()
      }
    } catch {
      /* silent */
    } finally {
      setTransitUpdating(null)
    }
  }

  // 2. Two-Way Confirmation (Boarded / Drop-off)
  const handleConfirmAttendance = async (action: 'PARENT_PICKUP_CONFIRMED' | 'PARENT_DROPOFF_CONFIRMED', studentId: string) => {
    if (!activeTrip) return
    const key = `${action}-${studentId}`
    setConfirming(key)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: activeTrip.id, studentId, action })
      })
      if (res.ok) {
        playHorn()
        // If dropoff confirmed, also dismiss proximity modal if open
        if (action === 'PARENT_DROPOFF_CONFIRMED') {
          setProximityAlert(p => ({ ...p, visible: false }))
        }
      }
    } catch {
      /* silent */
    } finally {
      setConfirming(null)
    }
  }

  // 3. Process Fee Payment
  const handleProcessPayment = async () => {
    if (!payingInvoice) return
    setIsProcessingPayment(true)
    try {
      const res = await fetch('/api/billing/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payingInvoice.id })
      })
      if (res.ok) {
        playHorn()
        setPaymentToast('Payment successful! Receipt generated.')
        if (me?.id) fetchPayments(me.id)
        setPayingInvoice(null)
      } else {
        setPaymentToast('Payment failed. Please try again.')
      }
    } catch {
      setPaymentToast('Payment network error.')
    } finally {
      setIsProcessingPayment(false)
      setTimeout(() => setPaymentToast(null), 4000)
    }
  }

  // 4. Send Message to School Admin
  const handleSendMessage = async () => {
    if (!msgContent.trim()) return
    setSendingMsg(true)
    try {
      const contactRes = await fetch('/api/messages/school-contact').catch(() => null)
      let adminId: string | null = null
      if (contactRes && contactRes.ok) {
        const cd = await contactRes.json()
        adminId = cd.admin?.id || null
      }
      if (!adminId) {
        setMsgToast('School desk is currently offline.')
        setSendingMsg(false)
        return
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: adminId, content: msgContent.trim() })
      })
      if (res.ok) {
        setMsgContent('')
        setMsgToast('Message transmitted to Transport Desk!')
        const updatedMsgRes = await fetch('/api/messages')
        if (updatedMsgRes.ok) {
          const md = await updatedMsgRes.json()
          setMessages(md.messages || [])
        }
      } else {
        setMsgToast('Failed to deliver message.')
      }
    } catch {
      setMsgToast('Network error delivering message.')
    } finally {
      setSendingMsg(false)
      setTimeout(() => setMsgToast(''), 3500)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'POST' })
    router.push('/')
  }

  // Active driver helper
  const activeDriver = drivers.find(d => d.lastLatitude && d.lastLongitude) || drivers[0]
  const todayStr = new Intl.DateTimeFormat(locale === 'ms' ? 'ms-MY' : (locale === 'zh' ? 'zh-CN' : 'en-GB'), {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date())

  const unreadNotifs = notifications.filter(n => !n.read).length
  const unreadMessages = messages.filter(m => !m.read).length
  const pendingInvoices = payments.filter(p => p.status === 'PENDING')
  const totalPendingAmount = pendingInvoices.reduce((sum, p) => sum + p.amount, 0)

  if (loading) {
    return (
      <div className="parent-portal-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Bus size={48} color="var(--p-yellow)" style={{ animation: 'pulse-ring 2s infinite' }} />
          <div style={{ marginTop: 16, fontSize: 16, fontWeight: 700, color: 'var(--p-text-muted)' }}>Loading Parent Portal...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="parent-portal-root">

      {/* ── NEARBY PROXIMITY POP-UP NOTIFICATION ───────────────────────────────── */}
      <AnimatePresence>
        {proximityAlert.visible && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="p-proximity-banner"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(255, 214, 10, 0.15)',
                  border: '1px solid var(--p-yellow)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, flexShrink: 0
                }}>
                  🚏
                </div>
                <div>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--p-yellow)', fontWeight: 800 }}>
                    {proximityAlert.isDropoff ? 'Drop-Off Zone Alert' : 'Pickup Area Arrival'}
                  </div>
                  <h3 style={{ margin: '3px 0', fontSize: 16, color: '#fff', fontWeight: 800 }}>
                    Bus is Approaching {proximityAlert.stopName}!
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--p-text-muted)', lineHeight: 1.4 }}>
                    {proximityAlert.isDropoff
                      ? 'Please proceed to the drop-off area to receive your child safely.'
                      : 'The bus is nearing your pickup stop. Please ensure your child is ready.'}
                    {proximityAlert.etaMins && ` Estimated Arrival: ~${proximityAlert.etaMins} mins.`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProximityAlert(p => ({ ...p, visible: false }))}
                style={{ background: 'none', border: 'none', color: 'var(--p-text-dim)', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Direct Confirmation Action inside proximity alert */}
            {activeTrip && students[0] && (
              <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  className="p-btn p-btn-secondary"
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={() => setActiveTab('TRACKING')}
                >
                  <MapPin size={14} /> View GPS
                </button>
                <button
                  className="p-btn p-btn-primary"
                  style={{ fontSize: 12, padding: '6px 16px' }}
                  disabled={confirming !== null}
                  onClick={() => handleConfirmAttendance('PARENT_DROPOFF_CONFIRMED', students[0].id)}
                >
                  <CheckCircle2 size={14} /> Confirm Student Received
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP HEADER (Desk / Cockpit Style) ──────────────────────────────────── */}
      <header className="p-portal-header">
        <div className="p-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #FFD60A, #F5A623)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(255,214,10,0.3)', flexShrink: 0
            }}>
              <Bus size={24} color="#08080A" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--p-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {schoolName} · Parent Portal
              </div>
              <h1 style={{ fontSize: 19, margin: 0, fontWeight: 800 }}>
                {me?.name ? `Hello, ${me.name.split(' ')[0]}` : 'Parent Dashboard'}
              </h1>
            </div>
          </div>

          {/* Desktop Navigation Pills */}
          <nav className="p-nav-pills">
            <button
              className={`p-nav-pill-btn ${activeTab === 'HOME' ? 'active' : ''}`}
              onClick={() => setActiveTab('HOME')}
            >
              <LayoutDashboard size={16} /> Home
            </button>
            <button
              className={`p-nav-pill-btn ${activeTab === 'TRACKING' ? 'active' : ''}`}
              onClick={() => setActiveTab('TRACKING')}
            >
              <MapPin size={16} /> Live Tracking
            </button>
            <button
              className={`p-nav-pill-btn ${activeTab === 'ATTENDANCE' ? 'active' : ''}`}
              onClick={() => setActiveTab('ATTENDANCE')}
            >
              <ClipboardCheck size={16} /> Attendance
            </button>
            <button
              className={`p-nav-pill-btn ${activeTab === 'PAYMENTS' ? 'active' : ''}`}
              onClick={() => setActiveTab('PAYMENTS')}
            >
              <CreditCard size={16} />
              Bus Fees
              {pendingInvoices.length > 0 && (
                <span style={{
                  background: 'var(--p-danger)', color: '#fff',
                  borderRadius: 999, fontSize: 10, padding: '1px 6px', fontWeight: 800
                }}>
                  {pendingInvoices.length}
                </span>
              )}
            </button>
            <button
              className={`p-nav-pill-btn ${activeTab === 'MESSAGES' ? 'active' : ''}`}
              onClick={() => setActiveTab('MESSAGES')}
            >
              <MessageSquare size={16} /> Messages
              {unreadMessages > 0 && (
                <span style={{
                  background: 'var(--p-yellow)', color: '#000',
                  borderRadius: 999, fontSize: 10, padding: '1px 6px', fontWeight: 800
                }}>
                  {unreadMessages}
                </span>
              )}
            </button>
            <button
              className={`p-nav-pill-btn ${activeTab === 'PROFILE' ? 'active' : ''}`}
              onClick={() => setActiveTab('PROFILE')}
            >
              <User size={16} /> Profile
            </button>
          </nav>

          {/* User quick badge & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', background: 'var(--p-surface-2)',
              border: '1px solid var(--p-line)', borderRadius: 9999, fontSize: 13, fontWeight: 700
            }}>
              <Sparkles size={14} color="var(--p-yellow)" />
              <span style={{ color: 'var(--p-yellow)' }}>Lvl {level}</span>
              <span style={{ color: 'var(--p-text-dim)' }}>|</span>
              <span>{xp} XP</span>
            </div>
            <button
              className="p-btn p-btn-secondary"
              style={{ padding: '8px 12px' }}
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────────────── */}
      <main className="p-main-container">

        {/* Global Toast Notification */}
        <AnimatePresence>
          {paymentToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding: '12px 18px',
                background: paymentToast.includes('successful') ? 'var(--p-success-bg)' : 'var(--p-danger-bg)',
                border: `1px solid ${paymentToast.includes('successful') ? 'var(--p-success)' : 'var(--p-danger)'}`,
                color: paymentToast.includes('successful') ? 'var(--p-success)' : 'var(--p-danger)',
                borderRadius: 14, fontWeight: 700, marginBottom: 18, fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 10
              }}
            >
              <CheckCircle size={18} /> {paymentToast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: HOME (Cockpit Overview)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'HOME' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

            {/* Delay Notice Banner if applicable */}
            {activeTrip && activeTrip.delayMinutes && activeTrip.delayMinutes > 0 && (
              <div className="p-glass-card" style={{
                marginBottom: 20, padding: 18,
                background: 'linear-gradient(135deg, rgba(255, 159, 10, 0.12), rgba(255, 159, 10, 0.04))',
                borderColor: 'rgba(255, 159, 10, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <AlertCircle size={24} color="var(--p-warning)" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, color: 'var(--p-warning)' }}>
                      Route Delay Advisory · {activeTrip.routeName || 'Assigned Route'}
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13.5, color: 'var(--p-text-muted)' }}>
                      The bus is running approximately ~{activeTrip.delayMinutes} minutes late.
                      {activeTrip.delayReason ? ` Reason: ${activeTrip.delayReason}.` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Students Manifest Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {students.map(student => {
                const isBoardingToday = student.status === 'BOARDING_TODAY'
                const isAbsentToday = student.status === 'ABSENT_TODAY'

                return (
                  <div key={student.id} className="p-glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                      {/* Student Info */}
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{
                          width: 64, height: 64, borderRadius: 16,
                          background: 'linear-gradient(135deg, #FFD60A, #F5A623)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 24, fontWeight: 900, color: '#08080A',
                          boxShadow: '0 4px 16px rgba(255, 214, 10, 0.25)', flexShrink: 0
                        }}>
                          {student.photoUrl ? (
                            <Image src={student.photoUrl} alt="" width={64} height={64} style={{ borderRadius: 16, objectFit: 'cover' }} />
                          ) : (
                            student.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h2 style={{ fontSize: 20, margin: 0, fontWeight: 800 }}>{student.name}</h2>
                            <span className={`p-badge ${
                              student.status === 'CHECKED_OUT' ? 'p-badge-success' :
                              student.status === 'ABSENT_TODAY' ? 'p-badge-danger' :
                              student.status === 'BOARDING_TODAY' ? 'p-badge-info' : 'p-badge-yellow'
                            }`}>
                              {student.status === 'CHECKED_OUT' ? 'Safely Dropped Off' :
                               student.status === 'BOARDING_TODAY' ? 'Boarding Today 🚌' :
                               student.status === 'ABSENT_TODAY' ? 'Absent Today 🚫' :
                               student.status === 'PENDING' ? 'Scheduled' : student.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--p-text-muted)', marginTop: 4 }}>
                            {student.grade} · {student.level} · Route: {student.route?.name || 'Assigned Route'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--p-text-dim)', marginTop: 2 }}>
                            🚏 Pickup: {student.pickupStop?.name || 'Home Stop'} · Drop-off: {student.dropoffStop?.name || 'School / Designated Drop-off'}
                          </div>
                        </div>
                      </div>

                      {/* Quick GPS Live tracking shortcut button */}
                      <button
                        className="p-btn p-btn-primary"
                        onClick={() => setActiveTab('TRACKING')}
                        style={{ padding: '10px 20px', fontWeight: 800 }}
                      >
                        <MapPin size={16} /> Track Bus Live
                      </button>
                    </div>

                    <hr style={{ borderColor: 'var(--p-line)', margin: '20px 0' }} />

                    {/* ── DAILY TRANSIT ATTENDANCE ACKNOWLEDGEMENT ── */}
                    <div style={{
                      background: 'var(--p-surface-2)',
                      border: '1px solid var(--p-line)',
                      borderRadius: 16,
                      padding: '16px 20px',
                      marginBottom: 16
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--p-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={15} color="var(--p-yellow)" /> Daily Transit Status Acknowledgement
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--p-text-muted)', marginTop: 2 }}>
                            Notify the driver and school admin whether {student.name.split(' ')[0]} is taking the bus today.
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            className={`p-btn ${isBoardingToday ? 'p-btn-success' : 'p-btn-secondary'}`}
                            disabled={transitUpdating === student.id}
                            onClick={() => handleTransitAcknowledgement(student.id, 'BOARDING_TODAY')}
                            style={{
                              fontSize: 13, padding: '8px 16px',
                              boxShadow: isBoardingToday ? '0 0 12px rgba(47,209,107,0.3)' : 'none'
                            }}
                          >
                            <Check size={16} /> Boarding Today
                          </button>
                          <button
                            className={`p-btn ${isAbsentToday ? 'p-btn-danger' : 'p-btn-secondary'}`}
                            disabled={transitUpdating === student.id}
                            onClick={() => handleTransitAcknowledgement(student.id, 'ABSENT_TODAY')}
                            style={{
                              fontSize: 13, padding: '8px 16px',
                              boxShadow: isAbsentToday ? '0 0 12px rgba(255,69,58,0.3)' : 'none'
                            }}
                          >
                            <X size={16} /> Absent Today
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ── TWO-WAY CONFIRMATION ACTION BUTTONS ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                      <button
                        className="p-btn p-btn-secondary"
                        disabled={confirming === `PARENT_PICKUP_CONFIRMED-${student.id}`}
                        onClick={() => handleConfirmAttendance('PARENT_PICKUP_CONFIRMED', student.id)}
                        style={{
                          background: 'rgba(47, 209, 107, 0.08)',
                          borderColor: 'rgba(47, 209, 107, 0.3)',
                          color: 'var(--p-success)',
                          padding: '14px 18px',
                          justifyContent: 'center',
                          fontSize: 13.5
                        }}
                      >
                        <CheckCircle2 size={18} />
                        {confirming === `PARENT_PICKUP_CONFIRMED-${student.id}` ? 'Confirming...' : 'Confirm Student Boarded'}
                      </button>

                      <button
                        className="p-btn p-btn-secondary"
                        disabled={confirming === `PARENT_DROPOFF_CONFIRMED-${student.id}`}
                        onClick={() => handleConfirmAttendance('PARENT_DROPOFF_CONFIRMED', student.id)}
                        style={{
                          background: 'rgba(77, 141, 255, 0.08)',
                          borderColor: 'rgba(77, 141, 255, 0.3)',
                          color: 'var(--p-blue)',
                          padding: '14px 18px',
                          justifyContent: 'center',
                          fontSize: 13.5
                        }}
                      >
                        <ShieldCheck size={18} />
                        {confirming === `PARENT_DROPOFF_CONFIRMED-${student.id}` ? 'Confirming...' : 'Confirm Safe Drop-Off'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Quick Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 24 }}>
              {/* Bus Status Card */}
              <div className="p-glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--p-text-muted)' }}>Assigned Bus Status</div>
                  <span className={`p-badge ${activeDriver?.lastLatitude ? 'p-badge-success' : 'p-badge-warning'}`}>
                    {activeDriver?.lastLatitude ? 'Active En Route' : 'Stationary / Standby'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: 'var(--p-surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--p-line)'
                  }}>
                    <Navigation size={22} color="var(--p-yellow)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{activeDriver?.name || 'Driver on Duty'}</div>
                    <div style={{ fontSize: 12, color: 'var(--p-text-muted)' }}>
                      Speed: {activeDriver?.currentSpeedKmH || 0} km/h · Phone: {activeDriver?.phone || 'On File'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Fees Card */}
              <div className="p-glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--p-text-muted)' }}>Bus Fee Status</div>
                  <span className={`p-badge ${pendingInvoices.length > 0 ? 'p-badge-danger' : 'p-badge-success'}`}>
                    {pendingInvoices.length > 0 ? `${pendingInvoices.length} Due` : 'Up to Date'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: pendingInvoices.length > 0 ? 'var(--p-danger)' : 'var(--p-success)' }}>
                      ${totalPendingAmount.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--p-text-muted)' }}>
                      {pendingInvoices.length > 0 ? 'Pending transportation balance' : 'All semester fees settled'}
                    </div>
                  </div>
                  <button
                    className="p-btn p-btn-secondary"
                    onClick={() => setActiveTab('PAYMENTS')}
                    style={{ fontSize: 13 }}
                  >
                    Manage
                  </button>
                </div>
              </div>

              {/* Academic Calendar Widget */}
              <div className="p-glass-card" style={{ padding: 20 }}>
                <CalendarCard />
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: LIVE TRACKING (Interactive GPS Map)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'TRACKING' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="p-glass-card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Real-Time Fleet GPS Tracking</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13.5, color: 'var(--p-text-muted)' }}>
                    Satellite positioning for school bus route and stop vicinity
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="p-badge p-badge-success">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--p-success)', display: 'inline-block' }} />
                    Live Satellite Feed
                  </span>
                  <div style={{ fontSize: 13, color: 'var(--p-text-dim)' }}>
                    Speed: <strong style={{ color: '#fff' }}>{activeDriver?.currentSpeedKmH || 0} km/h</strong>
                  </div>
                </div>
              </div>

              {/* Map Rendering Component */}
              <div style={{ borderRadius: 16, overflow: 'hidden', minHeight: 480, height: 520, border: '1px solid var(--p-line)' }}>
                {typeof window !== 'undefined' && <BusMap drivers={drivers} />}
              </div>

              {/* Stops Reference */}
              {students[0] && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16, marginTop: 20
                }}>
                  <div style={{ background: 'var(--p-surface-2)', padding: 14, borderRadius: 12, border: '1px solid var(--p-line)' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--p-text-dim)', fontWeight: 700 }}>Pickup Point</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{students[0].pickupStop?.name || 'Designated Pickup Stop'}</div>
                    <div style={{ fontSize: 12, color: 'var(--p-text-muted)', marginTop: 2 }}>Morning Schedule: {students[0].pickupTime || '07:30 AM'}</div>
                  </div>
                  <div style={{ background: 'var(--p-surface-2)', padding: 14, borderRadius: 12, border: '1px solid var(--p-line)' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--p-text-dim)', fontWeight: 700 }}>Drop-Off Point</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{students[0].dropoffStop?.name || 'School / Campus Drop-off'}</div>
                    <div style={{ fontSize: 12, color: 'var(--p-text-muted)', marginTop: 2 }}>Afternoon Schedule: On Route</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: ATTENDANCE & TRANSIT HISTORY
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ATTENDANCE' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Daily status modifier card */}
              <div className="p-glass-card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Student Transit Acknowledgement</h3>
                <p style={{ fontSize: 13.5, color: 'var(--p-text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
                  Ensure the driver’s passenger checklist accurately reflects your child’s status for morning pickup and afternoon return.
                </p>

                {students.map(student => (
                  <div key={student.id} style={{ background: 'var(--p-surface-2)', padding: 16, borderRadius: 14, border: '1px solid var(--p-line)', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <strong style={{ fontSize: 15 }}>{student.name}</strong>
                      <span className="p-badge p-badge-yellow">{student.grade}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className={`p-btn ${student.status === 'BOARDING_TODAY' ? 'p-btn-success' : 'p-btn-secondary'}`}
                        style={{ flex: 1, fontSize: 13 }}
                        disabled={transitUpdating === student.id}
                        onClick={() => handleTransitAcknowledgement(student.id, 'BOARDING_TODAY')}
                      >
                        <Check size={16} /> Boarding Today
                      </button>
                      <button
                        className={`p-btn ${student.status === 'ABSENT_TODAY' ? 'p-btn-danger' : 'p-btn-secondary'}`}
                        style={{ flex: 1, fontSize: 13 }}
                        disabled={transitUpdating === student.id}
                        onClick={() => handleTransitAcknowledgement(student.id, 'ABSENT_TODAY')}
                      >
                        <X size={16} /> Absent Today
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Attendance Statistics */}
              <div className="p-glass-card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Transit Activity Log</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {notifications.slice(0, 5).map(n => (
                    <div key={n.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                      background: 'var(--p-surface-2)', borderRadius: 12, border: '1px solid var(--p-line)'
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: 'rgba(47, 209, 107, 0.12)', color: 'var(--p-success)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <CheckCircle2 size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--p-text-muted)' }}>{n.body}</div>
                        <div style={{ fontSize: 11, color: 'var(--p-text-dim)', marginTop: 2 }}>
                          {new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--p-text-dim)', padding: 30 }}>
                      No recent attendance logs.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4: FEE PAYMENTS
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'PAYMENTS' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header Summary */}
            <div className="p-glass-card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Bus Fee & Transportation Billing</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13.5, color: 'var(--p-text-muted)' }}>
                    Review semester bus transport invoices, download digital receipts, and settle dues online
                  </p>
                </div>
                <div style={{
                  background: 'var(--p-surface-2)', border: '1px solid var(--p-line)',
                  borderRadius: 14, padding: '10px 18px', textAlign: 'right'
                }}>
                  <div style={{ fontSize: 11, color: 'var(--p-text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Total Balance Due</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: totalPendingAmount > 0 ? 'var(--p-danger)' : 'var(--p-success)' }}>
                    ${totalPendingAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <div className="p-glass-card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 18px 0', fontSize: 17, fontWeight: 800 }}>Transportation Invoices</h3>

              {payments.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--p-text-muted)', padding: '40px 0' }}>
                  <CreditCard size={40} color="var(--p-text-dim)" style={{ marginBottom: 12 }} />
                  <div>No billing records on file. Contact your school administrator to generate an invoice.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {payments.map(item => {
                    const isPaid = item.status === 'PAID'
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '16px 20px', background: 'var(--p-surface-2)',
                          border: '1px solid var(--p-line)', borderRadius: 14, flexWrap: 'wrap', gap: 14
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: isPaid ? 'rgba(47, 209, 107, 0.12)' : 'rgba(255, 159, 10, 0.12)',
                            color: isPaid ? 'var(--p-success)' : 'var(--p-warning)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            <CreditCard size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>
                              School Bus Transit Fee #{item.id.slice(-6).toUpperCase()}
                            </div>
                            <div style={{ fontSize: 12.5, color: 'var(--p-text-muted)', marginTop: 2 }}>
                              Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Immediate'} · Generated: {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                            {item.paidAt && (
                              <div style={{ fontSize: 11, color: 'var(--p-success)', marginTop: 2 }}>
                                Paid on {new Date(item.paidAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--p-text)' }}>
                              ${item.amount.toFixed(2)}
                            </div>
                            <span className={`p-badge ${isPaid ? 'p-badge-success' : 'p-badge-warning'}`}>
                              {isPaid ? 'PAID' : 'PENDING'}
                            </span>
                          </div>

                          {!isPaid ? (
                            <button
                              className="p-btn p-btn-primary"
                              style={{ fontSize: 13, padding: '8px 18px' }}
                              onClick={() => setPayingInvoice(item)}
                            >
                              Pay Now
                            </button>
                          ) : (
                            <button
                              className="p-btn p-btn-secondary"
                              style={{ fontSize: 12, padding: '8px 14px' }}
                              onClick={() => alert(`Receipt #${item.id.slice(-6).toUpperCase()} is verified and archived.`)}
                            >
                              <DownloadCloud size={14} /> Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
              {payingInvoice && (
                <div style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 20
                }}>
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="p-glass-card"
                    style={{ maxWidth: 440, width: '100%', padding: 28, background: '#141417' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Confirm Bus Fee Settlement</h3>
                      <button
                        onClick={() => setPayingInvoice(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--p-text-dim)', cursor: 'pointer' }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <p style={{ fontSize: 13.5, color: 'var(--p-text-muted)', lineHeight: 1.5 }}>
                      You are about to authorize an online fee payment for school bus transport service.
                    </p>

                    <div style={{
                      background: 'var(--p-surface-2)', padding: 16, borderRadius: 12,
                      border: '1px solid var(--p-line)', margin: '18px 0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: 'var(--p-text-muted)' }}>Invoice Reference</span>
                        <strong>#{payingInvoice.id.slice(-6).toUpperCase()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}>
                        <span>Total Payable</span>
                        <span style={{ color: 'var(--p-yellow)' }}>${payingInvoice.amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="p-btn p-btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => setPayingInvoice(null)}
                        disabled={isProcessingPayment}
                      >
                        Cancel
                      </button>
                      <button
                        className="p-btn p-btn-primary"
                        style={{ flex: 1 }}
                        onClick={handleProcessPayment}
                        disabled={isProcessingPayment}
                      >
                        {isProcessingPayment ? 'Processing...' : 'Authorize & Pay'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 5: MESSAGES
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'MESSAGES' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Compose */}
              <div className="p-glass-card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 17, fontWeight: 800 }}>Message School Transport Desk</h3>
                <p style={{ fontSize: 13, color: 'var(--p-text-muted)', marginBottom: 16 }}>
                  Directly dispatch updates, queries, or notices to the transport coordinator.
                </p>

                <textarea
                  className="p-input"
                  rows={4}
                  placeholder="e.g. My child will take alternative transport today..."
                  value={msgContent}
                  onChange={e => setMsgContent(e.target.value)}
                  style={{ resize: 'none', marginBottom: 14 }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {msgToast && (
                    <div style={{ fontSize: 12.5, color: 'var(--p-yellow)', fontWeight: 600 }}>{msgToast}</div>
                  )}
                  <button
                    className="p-btn p-btn-primary"
                    style={{ marginLeft: 'auto' }}
                    onClick={handleSendMessage}
                    disabled={sendingMsg || !msgContent.trim()}
                  >
                    {sendingMsg ? 'Transmitting...' : 'Send Message'}
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="p-glass-card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 17, fontWeight: 800 }}>Conversation History</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.map(m => (
                    <div key={m.id} style={{
                      padding: 14, background: 'var(--p-surface-2)', borderRadius: 12,
                      border: '1px solid var(--p-line)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <strong style={{ fontSize: 13.5 }}>{m.sender.name}</strong>
                        <span style={{ fontSize: 11, color: 'var(--p-text-dim)' }}>
                          {new Date(m.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--p-text-muted)', lineHeight: 1.4 }}>{m.content}</p>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--p-text-dim)', padding: 30 }}>
                      No dispatched messages.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 6: PROFILE & PREFERENCES
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'PROFILE' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="p-glass-card" style={{ padding: 28, maxWidth: 640, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 76, height: 76, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFD60A, #F5A623)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, fontWeight: 900, color: '#08080A', margin: '0 auto 12px auto'
                }}>
                  {me?.name ? me.name.charAt(0) : 'P'}
                </div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{me?.name || 'Parent Account'}</h2>
                <div style={{ fontSize: 13, color: 'var(--p-text-muted)', marginTop: 4 }}>{me?.email || ''}</div>
              </div>

              {/* Linked Children summary */}
              <div style={{ background: 'var(--p-surface-2)', padding: 18, borderRadius: 14, border: '1px solid var(--p-line)', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--p-text-dim)', textTransform: 'uppercase' }}>Linked Students</div>
                {students.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{s.name}</strong>
                      <div style={{ fontSize: 12, color: 'var(--p-text-muted)' }}>{s.grade} · {s.level}</div>
                    </div>
                    <span className="p-badge p-badge-yellow">{s.route?.name || 'Bus Route'}</span>
                  </div>
                ))}
              </div>

              {/* Language Selection */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--p-text-muted)', marginBottom: 10 }}>
                  <Globe size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Display Language
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { code: 'en' as const, label: 'English' },
                    { code: 'ms' as const, label: 'Bahasa Melayu' },
                    { code: 'zh' as const, label: '中文' },
                  ].map(lang => (
                    <button
                      key={lang.code}
                      className={`p-btn ${locale === lang.code ? 'p-btn-primary' : 'p-btn-secondary'}`}
                      style={{ flex: 1, fontSize: 13 }}
                      onClick={() => setLocale(lang.code)}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="p-btn p-btn-danger"
                style={{ width: '100%', padding: '12px 0' }}
                onClick={handleLogout}
              >
                <LogOut size={16} /> Sign Out of Account
              </button>
            </div>
          </motion.div>
        )}

      </main>

      {/* ── MOBILE BOTTOM NAVIGATION DOCK ──────────────────────────────────────── */}
      <nav className="p-mobile-nav">
        <button
          className={`p-mobile-nav-item ${activeTab === 'HOME' ? 'active' : ''}`}
          onClick={() => setActiveTab('HOME')}
        >
          <LayoutDashboard size={20} /> Home
        </button>
        <button
          className={`p-mobile-nav-item ${activeTab === 'TRACKING' ? 'active' : ''}`}
          onClick={() => setActiveTab('TRACKING')}
        >
          <MapPin size={20} /> Track
        </button>
        <button
          className={`p-mobile-nav-item ${activeTab === 'ATTENDANCE' ? 'active' : ''}`}
          onClick={() => setActiveTab('ATTENDANCE')}
        >
          <ClipboardCheck size={20} /> Transit
        </button>
        <button
          className={`p-mobile-nav-item ${activeTab === 'PAYMENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('PAYMENTS')}
        >
          <CreditCard size={20} />
          {pendingInvoices.length > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 18, width: 7, height: 7,
              borderRadius: '50%', background: 'var(--p-danger)'
            }} />
          )}
          Fees
        </button>
        <button
          className={`p-mobile-nav-item ${activeTab === 'MESSAGES' ? 'active' : ''}`}
          onClick={() => setActiveTab('MESSAGES')}
        >
          <MessageSquare size={20} /> Desk
        </button>
        <button
          className={`p-mobile-nav-item ${activeTab === 'PROFILE' ? 'active' : ''}`}
          onClick={() => setActiveTab('PROFILE')}
        >
          <User size={20} /> Profile
        </button>
      </nav>

    </div>
  )
}
