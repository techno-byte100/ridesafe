'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import '../parent.css'

// ── Types ─────────────────────────────────────────────────────────────────────
interface StudentData {
  id: string; name: string; grade: string; level: string;
  status: string; photoUrl?: string; pickupTime?: string;
  parentContact1: string; parentContact2?: string;
  isSelfPickup: boolean;
  pickupStop?: { name: string; latitude: number; longitude: number };
  dropoffStop?: { name: string };
  route?: { name: string };
}
interface DriverData {
  id: string; name: string; phone?: string;
  lastLatitude: number | null; lastLongitude: number | null;
  lastLocationUpdate?: string; currentSpeedKmH?: number;
  distanceKm?: number; etaMins?: number; isNear?: boolean;
}
interface NotifData {
  id: string; title: string; body: string; type: string;
  read: boolean; createdAt: string;
}
interface MessageData {
  id: string; content: string; read: boolean; createdAt: string;
  sender: { name: string };
}

const BusMap = dynamic(() => import('@/components/shared/BusMap'), { ssr: false })

import { useAudio } from '@/hooks/useAudio'
import { useTranslation } from '@/i18n/provider'
import CalendarCard from '@/components/parent/CalendarCard'
import { Target, Flame, ShieldCheck, Sunrise, AlertTriangle, CheckCircle, AlertCircle, Trophy, Medal, Award, Phone, Bus, Clock, Clipboard, Home, XCircle, User, Settings, Bell, HelpCircle, LogOut, Globe } from 'lucide-react'

// ── Gamification helpers ──────────────────────────────────────────────────────
const BADGES = [
  { id: 'first_check', icon: <Target size={16}/>, label: 'First Check-in', xp: 50 },
  { id: 'week_streak', icon: <Flame size={16}/>, label: '5-Day Streak', xp: 100 },
  { id: 'safe_rider', icon: <ShieldCheck size={16}/>, label: 'Safe Rider', xp: 75 },
  { id: 'early_bird', icon: <Sunrise size={16}/>, label: 'Early Bird', xp: 60 },
]
function getXP(notifs: NotifData[]): number { return Math.min(notifs.length * 25, 500) }
function getLevel(xp: number): number { return Math.floor(xp / 100) + 1 }
function getLevelLabel(lvl: number): string {
  return ['', 'Rookie', 'Regular', 'Reliable', 'Champion', 'Legend'][Math.min(lvl, 5)] || 'Legend'
}

export default function ParentDashboard() {
  const { locale, setLocale, t } = useTranslation()
  const [students, setStudents] = useState<StudentData[]>([])
  const [drivers, setDrivers] = useState<DriverData[]>([])
  const [notifications, setNotifications] = useState<NotifData[]>([])
  const [schoolName, setSchoolName] = useState('RideSafe School')
  const [, setLastNotifId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'HOME' | 'MY_CHILD' | 'MESSAGES' | 'PROFILE'>('HOME')
  const [showMap, setShowMap] = useState(false)
  const [busNearby, setBusNearby] = useState(false)
  const [busNearbyStop, setBusNearbyStop] = useState<string>('')
  const busNearbyRef = useRef(false)
  const prevDriverLatRef = useRef<number | null>(null)
  // Active trip delay info
  const [activeTrip, setActiveTrip] = useState<{ id: string; delayMinutes?: number; delayReason?: string; routeName?: string } | null>(null)
  // Confirmation loading state
  const [confirming, setConfirming] = useState<string | null>(null)

  // Messages state
  const [messages, setMessages] = useState<MessageData[]>([])
  const [msgContent, setMsgContent] = useState('')
  const [sending, setSending] = useState(false)
  const [msgToast, setMsgToast] = useState('')

  // Profile menu state
  const [me, setMe] = useState<{ name: string; email: string; phone?: string } | null>(null)
  const [profilePanel, setProfilePanel] = useState<'INFO' | 'HELP' | null>(null)
  const [profileNotice, setProfileNotice] = useState('')
  const showProfileNotice = (msg: string) => { setProfileNotice(msg); setTimeout(() => setProfileNotice(''), 3000) }

  // App Unlock & Audio State
  const [appUnlocked, setAppUnlocked] = useState(true)
  const { play: playAlert, isReady: isAlertReady } = useAudio('/alert toon.mp3')
  const { play: playHorn, isReady: isHornReady } = useAudio('/bus-horn.mp3')

  const router = useRouter()

  // Gamification
  const xp = getXP(notifications)
  const level = getLevel(xp)
  const xpInLevel = xp % 100
  const earnedBadges = BADGES.slice(0, Math.min(level, BADGES.length))

  // Request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Real GPS proximity check using Haversine formula to student's assigned pickup stop
  const checkBusProximity = (driversData: DriverData[], studentsData: StudentData[]) => {
    if (!studentsData[0]?.pickupStop) return
    const activeDriver = driversData[0]
    if (!activeDriver?.lastLatitude || !activeDriver?.lastLongitude) return
    const stop = studentsData[0].pickupStop
    if (!stop.latitude || !stop.longitude) return

    // Haversine distance in km
    const R = 6371
    const dLat = (stop.latitude - activeDriver.lastLatitude) * (Math.PI / 180)
    const dLon = (stop.longitude - activeDriver.lastLongitude) * (Math.PI / 180)
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(activeDriver.lastLatitude * (Math.PI / 180)) * Math.cos(stop.latitude * (Math.PI / 180)) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const THRESHOLD_KM = 0.5 // 500 metres
    if (distKm <= THRESHOLD_KM) {
      if (!busNearbyRef.current) {
        busNearbyRef.current = true
        setBusNearby(true)
        setBusNearbyStop(stop.name)
        playAlert()
        if (Notification.permission === 'granted') {
          const etaMins = activeDriver.currentSpeedKmH && activeDriver.currentSpeedKmH > 0
            ? Math.round((distKm / activeDriver.currentSpeedKmH) * 60)
            : null
          const etaStr = etaMins !== null ? ` ETA: ~${etaMins} min${etaMins !== 1 ? 's' : ''}.` : ''
          try {
            new Notification('RideSafe 🚌 Bus Approaching', {
              body: `Your bus is approaching ${stop.name}!${etaStr} Get ready.`,
              icon: '/favicon.ico'
            })
          } catch { /* ignore */ }
        }
        setTimeout(() => { busNearbyRef.current = false; setBusNearby(false); setBusNearbyStop('') }, 60000)
      }
    } else {
      // Bus has moved away from stop — reset alert so it can re-fire next approach
      if (busNearbyRef.current && distKm > THRESHOLD_KM + 0.2) {
        busNearbyRef.current = false
        setBusNearby(false)
        setBusNearbyStop('')
      }
    }
    prevDriverLatRef.current = activeDriver.lastLatitude
  }

  useEffect(() => {
    // Fetch school name once
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d.schoolName) setSchoolName(d.schoolName)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    // Initial fetch including location
    const fetchInitialData = async () => {
      try {
        const [studentsRes, locationRes, notifRes, msgRes, meRes] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/location'),
          fetch('/api/notifications'),
          fetch('/api/messages'),
          fetch('/api/auth/me'),
        ])
        const studentsData = await studentsRes.json()
        const locationData = await locationRes.json()
        const notificationsData = await notifRes.json()
        const msgData = await msgRes.json()
        if (meRes.ok) {
          const meData = await meRes.json()
          if (meData.user) setMe(meData.user)
        }

        if (studentsData.error === 'Unauthorized') { router.push('/'); return }

        const currentStudents = studentsData.students || []
        setStudents(currentStudents)
        const driversData = locationData.drivers || []
        setDrivers(driversData)
        checkBusProximity(driversData, currentStudents)

        const newNotifs = notificationsData.notifications || []
        setNotifications(newNotifs)
        setMessages(msgData.messages || [])

        // Fetch active trip delay info
        try {
          const tripRes = await fetch('/api/trips/active')
          if (tripRes.ok) {
            const tripData = await tripRes.json()
            if (tripData.trip) setActiveTrip(tripData.trip)
          }
        } catch { /* silent — delay info is supplementary */ }

        if (loading) setLoading(false)
      } catch (error) { console.error(error) }
    }

    // Interval fetch for notifications & messages only (every 15s)
    const fetchBackgroundData = async () => {
      try {
        const [notifRes, msgRes] = await Promise.all([
          fetch('/api/notifications'),
          fetch('/api/messages'),
        ])
        const notificationsData = await notifRes.json()
        const msgData = await msgRes.json()

        const newNotifs = notificationsData.notifications || []
        setNotifications(newNotifs)
        setMessages(msgData.messages || [])

        if (newNotifs.length > 0) {
          const latest = newNotifs[0]
          setLastNotifId(prev => {
            if (prev !== null && prev !== latest.id) {
              if (latest.type === 'EMERGENCY') playAlert()
              else playHorn()
              if (Notification.permission === 'granted') {
                try {
                  navigator.serviceWorker?.ready.then(reg => {
                    reg.showNotification(latest.title, { body: latest.body, icon: '/favicon.ico' })
                  }).catch(() => new Notification(latest.title, { body: latest.body }))
                } catch { new Notification(latest.title, { body: latest.body }) }
              }
            }
            return latest.id
          })
        }
      } catch (error) { console.error(error) }
    }

    fetchInitialData()
    const interval = setInterval(fetchBackgroundData, 15000)

    // Setup SSE for real-time location updates
    const evtSource = new EventSource('/api/location/stream')
    evtSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data)
        setDrivers(prevDrivers => {
          // If we already have the driver in state, update their fields
          const exists = prevDrivers.some(d => d.id === update.id)
          const newDrivers = exists 
            ? prevDrivers.map(d => d.id === update.id ? { ...d, ...update } : d)
            : [...prevDrivers, update]
          
          // Trigger proximity check with updated drivers
          // We have to use a functional approach or ref to get current students
          // For simplicity, checkBusProximity relies on the most recent students state.
          // In React, this is tricky if checkBusProximity captures old students state,
          // but setDrivers functional update is safe. We will call checkBusProximity in a separate effect
          return newDrivers
        })
      } catch (e) {
        console.error('SSE Error parsing update:', e)
      }
    }

    return () => {
      clearInterval(interval)
      evtSource.close()
    }
    // eslint-disable-next-line
  }, [router])

  // Trigger proximity check when drivers or students change
  useEffect(() => {
    if (drivers.length > 0 && students.length > 0) {
      checkBusProximity(drivers, students)
    }
  }, [drivers, students])

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'POST' }); router.push('/')
  }

  const sendMessage = async () => {
    if (!msgContent.trim()) return
    setSending(true)
    try {
      // Find an admin to message via the parent-safe school-contact lookup
      // (the full user list endpoint is admin-only and always rejects parents)
      const contactRes = await fetch('/api/messages/school-contact').catch(() => null)
      let adminId: string | null = null
      if (contactRes && contactRes.ok) {
        const cd = await contactRes.json()
        adminId = cd.admin?.id || null
      }
      if (!adminId) { setMsgToast('No admin found to message'); setSending(false); return }
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: adminId, content: msgContent.trim() })
      })
      if (res.ok) { setMsgContent(''); setMsgToast('Message sent!') }
      else setMsgToast('Failed to send')
    } catch { setMsgToast('Network error') } finally {
      setSending(false); setTimeout(() => setMsgToast(''), 3000)
    }
  }


  if (loading) return (
    <div className="mobile-wrapper">
      <div className="mobile-theme" style={{ padding:'2rem 1rem' }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: i===1?80:60, marginBottom:12, borderRadius:16 }} />)}
      </div>
    </div>
  )

  const todayStr = new Intl.DateTimeFormat(locale === 'ms' ? 'ms-MY' : (locale === 'zh' ? 'zh-CN' : 'en-GB'), { weekday:'long', day:'numeric', month:'long' }).format(new Date())
  const unreadNotifs = notifications.filter(n => !n.read).length

  // ── Tab icons ───────────────────────────────────────────────────────────────
  const NAV_TABS = [
    { key:'HOME',       label: t('nav.home'),     icon:(c:string)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { key:'MY_CHILD',  label: t('parent.myChildren'),  icon:(c:string)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { key:'MESSAGES',  label: t('nav.messages'),  icon:(c:string)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { key:'PROFILE',   label: t('nav.profile'),   icon:(c:string)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ] as const


  return (
    <div className="mobile-wrapper">
      <div className="mobile-theme" style={{ paddingBottom:'80px', minHeight:'100vh', overflowX:'hidden' }}>

        {/* Bus Nearby Alert Banner */}
        <AnimatePresence>
          {busNearby && (
            <motion.div initial={{ y:-60, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:-60, opacity:0 }}
              style={{ position:'fixed', top:0, left:0, right:0, zIndex:200,
                background:'linear-gradient(90deg,#FFD100,#F5A623)', color:'#111', padding:'10px 16px',
                display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:14, textAlign:'center', justifyContent:'center' }}>
              🚌 {t('parent.busApproaching')}
              {drivers[0]?.etaMins != null && ` • ETA ~${drivers[0].etaMins} ${t('common.minutes')}`}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Modal */}
        <AnimatePresence>
          {showMap && (
            <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.9 }}
              style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:100, background:'var(--bg-color)', display:'flex', flexDirection:'column' }}>
              <div className="mobile-header" style={{ borderRadius:0, display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'16px', marginBottom:0 }}>
                <h2 style={{ margin:0, fontSize:'18px', color:'#f1f5f9' }}>{t('parent.trackBus')}</h2>
                <button onClick={() => setShowMap(false)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#f1f5f9', padding:'8px 16px', borderRadius:'20px', fontWeight:'bold', cursor:'pointer' }}>{t('common.close')}</button>
              </div>
              <div style={{ flex:1, position:'relative' }}>
                {typeof window !== 'undefined' && <BusMap drivers={drivers} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="mobile-header">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:'13px', opacity:0.65, marginBottom:'4px', color:'#e2e8f0' }}>{todayStr}</div>
              <h1 style={{ margin:0, fontSize:'22px', fontWeight:800, color:'#fff' }}>
                Hi, {students[0] ? students[0].name.split(' ')[1] || students[0].name.split(' ')[0] : 'Parent'}               </h1>
            </div>
            <div style={{ position:'relative' }}>
              <button onClick={() => setActiveTab('MESSAGES')} style={{ background:'none', border:'none', cursor:'pointer', padding:4, position:'relative' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unreadNotifs > 0 && <span style={{ position:'absolute', top:0, right:0, background:'var(--danger)', width:8, height:8, borderRadius:'50%' }} />}
              </button>
            </div>
          </div>

          {/* XP / Gamification Bar */}
          <div className="streak-card" style={{ marginTop:'12px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'#FFD100' }}>
                Level {level} — {getLevelLabel(level)}
              </div>
              <div style={{ fontWeight:600, fontSize:13, color:'#F5A623' }}>{xp} XP</div>
            </div>
            <div className="xp-bar-track">
              <motion.div className="xp-bar-fill" initial={{ width:0 }} animate={{ width:`${xpInLevel}%` }} />
            </div>
            {earnedBadges.length > 0 && (
              <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                {earnedBadges.map(b => (
                  <motion.span key={b.id} whileHover={{ scale:1.15 }}
                    title={`${b.label} (+${b.xp} XP)`}
                    style={{ fontSize:18, cursor:'default' }}>{b.icon}</motion.span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:'16px 16px 0 16px' }}>

          {/* ── HOME TAB ──────────────────────────────────────────────────────── */}
          {activeTab === 'HOME' && (
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>

              {/* ── Delay Notice Card ── */}
              {activeTrip && activeTrip.delayMinutes && activeTrip.delayMinutes > 0 && (
                <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
                  className="mobile-card" style={{ marginBottom:14, background:'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))', border:'1px solid rgba(245,158,11,0.4)', padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:22 }}>⚠️</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:'var(--warning)' }}>{t('parent.delayNotice')}</div>
                      <div style={{ fontSize:13, color:'var(--text-main)', marginTop:2 }}>
                        {activeTrip.routeName || t('parent.assignedRoute')} {t('parent.routeRunningLate')} ~{activeTrip.delayMinutes} {t('common.minutes')}
                        {activeTrip.delayReason ? ` (${t('common.reason')}: ${activeTrip.delayReason})` : ''}.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {students.map(student => (
                <div key={student.id}>
                  {/* Student card */}
                  <div className="mobile-card" style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:12 }}>
                    <div style={{ width:58, height:58, borderRadius:'50%', background:'linear-gradient(135deg,#FFD100,#F5A623)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:800, color:'#111', boxShadow:'0 4px 10px rgba(255,209,0,0.3)', flexShrink:0 }}>
                      {student.photoUrl ? <Image src={student.photoUrl} alt="" width={58} height={58} style={{ objectFit:'cover', borderRadius:'50%' }} /> : student.name.charAt(0)}
                    </div>
                    <div style={{ flex:1 }}>
                      <h2 style={{ margin:0, fontSize:'17px', color:'var(--text-main)' }}>{student.name}</h2>
                      <div style={{ fontSize:'13px', color:'var(--text-muted)', marginTop:'3px' }}>{student.grade} · {student.level}</div>
                    </div>
                    <span className={`badge ${student.status === 'CHECKED_OUT' ? 'badge-success' : 'badge-warning'}`}>
                      {student.status === 'CHECKED_OUT' ? t('parent.droppedOff') : t('parent.onBus')}
                    </span>
                  </div>

                  {/* Driver info card */}
                  {drivers[0] && (
                    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
                      className="mobile-card" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, padding:'12px 16px' }}>
                      <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--info-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>‍️</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, color:'var(--text-main)' }}>{drivers[0].name}</div>
                        <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>{t('parent.assignedDriver')} · {drivers[0].phone || 'No phone'}</div>
                      </div>
                      <div className={`badge ${drivers[0].lastLatitude ? 'badge-success' : 'badge-pending'}`} style={{ fontSize:'11px' }}>
                        {drivers[0].lastLatitude ? '️ Online' : 'Offline'}
                      </div>
                    </motion.div>
                  )}

                  {/* Live map button */}
                  <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowMap(true)}
                    style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#FFD100,#F5A623)', color:'#111', border:'none', borderRadius:'14px', fontWeight:800, fontSize:'15px', marginBottom:'10px', display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', boxShadow:'0 4px 16px rgba(255,209,0,0.4)', cursor:'pointer' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                    {t('parent.trackBus')}
                  </motion.button>

                  {/* ── Two-Way Confirmation Buttons ── */}
                  {activeTrip && (
                    <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                      <motion.button whileTap={{ scale:0.95 }}
                        disabled={confirming === `pickup-${student.id}`}
                        onClick={async () => {
                          setConfirming(`pickup-${student.id}`)
                          try {
                            await fetch('/api/attendance', {
                              method:'POST', headers:{'Content-Type':'application/json'},
                              body:JSON.stringify({ tripId: activeTrip.id, studentId: student.id, action:'PARENT_PICKUP_CONFIRMED' })
                            })
                            playHorn()
                          } catch { /* silent */ } finally { setConfirming(null) }
                        }}
                        style={{ flex:1, padding:'11px 0', background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.4)', color:'var(--success)', borderRadius:12, fontWeight:700, fontSize:'13px', cursor:'pointer' }}>
                        {confirming === `pickup-${student.id}` ? '…' : `✅ ${t('parent.confirmBoarded')}`}
                      </motion.button>
                      <motion.button whileTap={{ scale:0.95 }}
                        disabled={confirming === `dropoff-${student.id}`}
                        onClick={async () => {
                          setConfirming(`dropoff-${student.id}`)
                          try {
                            await fetch('/api/attendance', {
                              method:'POST', headers:{'Content-Type':'application/json'},
                              body:JSON.stringify({ tripId: activeTrip.id, studentId: student.id, action:'PARENT_DROPOFF_CONFIRMED' })
                            })
                            playHorn()
                          } catch { /* silent */ } finally { setConfirming(null) }
                        }}
                        style={{ flex:1, padding:'11px 0', background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.4)', color:'#60a5fa', borderRadius:12, fontWeight:700, fontSize:'13px', cursor:'pointer' }}>
                        {confirming === `dropoff-${student.id}` ? '…' : `🏠 ${t('parent.confirmDropoff')}`}
                      </motion.button>
                    </div>
                  )}
                </div>
              ))}

              {/* Academic Calendar Card */}
              <div style={{ marginBottom: 14 }}>
                <CalendarCard />
              </div>

              {/* Attendance Stats */}
              <div className="mobile-card">
                <h3 style={{ margin:'0 0 12px 0', fontSize:'15px' }}>This Week</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', textAlign:'center', gap:'8px' }}>
                  {(() => {
                    const arrivals = notifications.filter(n => n.type === 'INFO').length
                    const alerts   = notifications.filter(n => n.type === 'EMERGENCY').length
                    const warnings = notifications.filter(n => n.type === 'WARNING').length
                    const total    = notifications.length
                    return [
                      { val: arrivals,         label:'Arrive', color:'var(--success)' },
                      { val: warnings,         label:'Warning', color:'var(--warning)' },
                      { val: alerts,           label:'Alert',  color:'var(--danger)' },
                      { val: Math.max(0,total),label:'Total',  color:'var(--text-muted)' },
                    ]
                  })().map(({ val, label, color }) => (
                    <div key={label}>
                      <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', bounce:0.6, delay:0.2 }}
                        style={{ fontSize:'22px', fontWeight:800, color }}>{val}</motion.div>
                      <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'3px' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Notifications */}
              <h3 style={{ fontSize:'15px', margin:'20px 0 10px 0', color:'var(--text-main)' }}>Recent Activity</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {notifications.slice(0, 4).map(n => (
                  <motion.div key={n.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                    className="mobile-card" style={{ marginBottom:0, display:'flex', alignItems:'center', gap:'14px', padding:'12px 14px' }}>
                    <div style={{ width:38, height:38, borderRadius:'50%',
                      background: n.type==='EMERGENCY' ? 'rgba(239,68,68,0.1)' : n.type==='WARNING' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                      color: n.type==='EMERGENCY' ? 'var(--danger)' : n.type==='WARNING' ? 'var(--warning)' : 'var(--success)',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {n.type==='EMERGENCY' ? <AlertTriangle size={20}/> : n.type==='WARNING' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text-main)' }}>{n.title}</div>
                      <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  </motion.div>
                ))}
                {notifications.length === 0 && <div style={{ textAlign:'center', color:'var(--text-muted)', padding:20 }}>No activity yet</div>}
              </div>

              {/* ── SOS Panic Button ── */}
              <motion.button
                whileHover={{ scale:1.02 }} whileTap={{ scale:0.95 }}
                onClick={async () => {
                  if (!confirm('🆘 Are you sure you want to send an emergency alert?')) return
                  playAlert()
                  await fetch('/api/emergency', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ source:'PARENT' }) })
                  alert('🆘 Emergency alert sent! School admin has been notified.')
                }}
                style={{ width:'100%', padding:'14px', marginTop:'20px', background:'linear-gradient(135deg,#dc2626,#ef4444)', color:'#fff', border:'none', borderRadius:14, fontWeight:800, fontSize:'1rem', cursor:'pointer', letterSpacing:'0.5px', boxShadow:'0 4px 20px rgba(239,68,68,0.3)' }}>
                🆘 SOS EMERGENCY
              </motion.button>

              {/* ── Rate Last Ride ── */}
              <div className="mobile-card" style={{ marginTop:14, padding:'16px' }}>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:10 }}>⭐ Rate Your Last Ride</div>
                <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                  {[1,2,3,4,5].map(star => (
                    <motion.button key={star} whileHover={{ scale:1.3 }} whileTap={{ scale:0.9 }}
                      onClick={async () => {
                        const res = await fetch('/api/ratings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tripId: 'latest', rating: star }) })
                        if (res.ok) alert(`Thank you! You rated ${star} stars.`)
                        else { const d = await res.json(); alert(d.error || 'Already rated') }
                      }}
                      style={{ background:'none', border:'none', fontSize:28, cursor:'pointer', filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
                      ⭐
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Green Leaderboard ── */}
              <div className="mobile-card" style={{ marginTop:14, padding:'16px' }}>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:10 }}>Green Leaderboard</div>
                <div style={{ display:'grid', gridTemplateColumns:'32px 1fr auto', gap:'8px', alignItems:'center' }}>
                  {[
                    { rank:1, name: students[0]?.name || 'You', score: Math.min(notifications.length * 12 + 85, 100), badge: <Trophy size={18}/> },
                    { rank:2, name:'Student B', score:82, badge: <Medal size={18}/> },
                    { rank:3, name:'Student C', score:74, badge: <Award size={18}/> },
                  ].map(r => (
                    <React.Fragment key={r.rank}>
                      <div style={{ fontWeight:800, fontSize:14, color: r.rank === 1 ? '#FFD100' : 'var(--text-muted)' }}>{r.badge}</div>
                      <div style={{ fontWeight: r.rank === 1 ? 700 : 400, color: r.rank === 1 ? 'var(--text-main)' : 'var(--text-muted)', fontSize:14 }}>{r.name}</div>
                      <div style={{ fontWeight:700, fontSize:14, color:'var(--success)' }}>{r.score}%</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* ── Digital E-Pass ── */}
              <div className="mobile-card" style={{ marginTop:14, padding:'16px', textAlign:'center', background:'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(99,102,241,0.04))' }}>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>Digital Boarding Pass</div>
                <div style={{ fontFamily:'monospace', fontSize:28, letterSpacing:6, fontWeight:800, color:'var(--primary)', margin:'8px 0' }}>
                  {(students[0]?.id || 'PASS').slice(0,8).toUpperCase()}
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{students[0]?.name || 'Student'} · {new Date().toLocaleDateString()}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Show this to the driver for boarding</div>
              </div>

            </motion.div>
          )}

          {/* ── MY CHILD TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'MY_CHILD' && (
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
              {students.map(student => (
                <div key={student.id}>
                  {/* Student ID Card */}
                  <div className="mobile-card" style={{ padding:0, overflow:'hidden', marginBottom:14 }}>
                    {/* Card header stripe */}
                    <div style={{ background:'linear-gradient(135deg,#4f46e5,#6366f1)', padding:'16px', display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:60, height:60, borderRadius:'50%', background:'linear-gradient(135deg,#FFD100,#F5A623)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:800, color:'#111', border:'3px solid rgba(255,255,255,0.3)', flexShrink:0 }}>
                        {student.name.charAt(0)}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:18, color:'#fff' }}>{student.name}</div>
                        <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)', marginTop:2 }}>{student.grade} · {student.level}</div>
                        <div style={{ display:'flex', gap:6, marginTop:6 }}>
                          <span className="badge" style={{ background:'rgba(255,255,255,0.2)', color:'#fff', fontSize:'0.7rem' }}>{schoolName}</span>
                          <span className={`badge ${student.status === 'CHECKED_OUT' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize:'0.7rem' }}>
                            {student.status === 'CHECKED_OUT' ? 'Checked In' : 'En Route'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Info rows */}
                    <div style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                      {[
                        { icon:<Phone size={14}/>, label:'Primary Contact', val:student.parentContact1||'—' },
                        { icon:<Bus size={14}/>, label:'Transport', val:student.isSelfPickup?'Self-Pickup':'School Bus' },
                        { icon:<Clock size={14}/>, label:'Pickup Time', val:student.pickupTime||'On-Route' },
                        { icon:<Clipboard size={14}/>, label:'Student ID', val:`STU-${student.id.slice(-5).toUpperCase()}` },
                      ].map(({ icon, label, val }) => (
                        <div key={label}>
                          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>{icon} {label}</div>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-main)' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance Summary Ring + Stats */}
                  <div className="mobile-card" style={{ marginBottom:14 }}>
                    <h3 style={{ margin:'0 0 14px 0', fontSize:15 }}>Attendance Overview</h3>
                    {/* Period tabs */}
                    <div style={{ display:'flex', gap:'0.75rem', marginBottom:16, overflowX:'auto' }}>
                      {['This Week','This Month','Semester'].map((p, i) => (
                        <span key={p} style={{ padding:'4px 14px', borderRadius:999, fontSize:12, fontWeight:600, whiteSpace:'nowrap', cursor:'pointer',
                          background: i===0 ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                          color: i===0 ? '#fff' : 'var(--text-muted)' }}>{p}</span>
                      ))}
                    </div>
                    {/* Stats grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
                      {(() => {
                        const onTime  = notifications.filter(n => n.type === 'INFO').length
                        const late    = notifications.filter(n => n.type === 'WARNING').length
                        const absent  = notifications.filter(n => n.type === 'EMERGENCY').length
                        const selfPU  = student.isSelfPickup ? notifications.length : 0
                        return [
                          { icon:<CheckCircle size={22}/>, label:'On Time',    count: onTime,  color:'var(--success)', bg:'var(--success-bg)' },
                          { icon:<Clock size={22}/>, label:'Late',        count: late,    color:'var(--warning)', bg:'var(--warning-bg)' },
                          { icon:<XCircle size={22}/>, label:'Absent',      count: absent,  color:'var(--danger)',  bg:'var(--danger-bg)' },
                          { icon:<Home size={22}/>, label:'Self Pickup', count: selfPU,  color:'var(--info)',    bg:'var(--info-bg)' },
                        ]
                      })().map(({ icon, label, count, color, bg }, i) => (
                        <div key={i} style={{ background:bg, borderRadius:12, padding:'12px', display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ display:'flex', color }}>{icon}</span>
                          <div>
                            <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', bounce:0.6 }}
                              style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>{count}</motion.div>
                            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Attendance rate bar — computed from real data */}
                    <div style={{ marginTop:14 }}>
                      {(() => {
                        const total   = notifications.length
                        const absent  = notifications.filter(n => n.type === 'EMERGENCY').length
                        const rate    = total === 0 ? 100 : Math.round(((total - absent) / total) * 100)
                        return (
                          <>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
                              <span style={{ color:'var(--text-muted)' }}>Attendance Rate</span>
                              <span style={{ fontWeight:700, color:'var(--success)' }}>{rate}%</span>
                            </div>
                            <div className="xp-bar-track">
                              <motion.div className="xp-bar-fill" initial={{ width:0 }} animate={{ width:`${rate}%` }}
                                style={{ background:'linear-gradient(90deg,var(--success),#34d399)' }} />
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <h3 style={{ fontSize:15, margin:'0 0 12px 0', color:'var(--text-main)' }}>️ Activity Log</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {notifications.length === 0 && (
                      <div className="mobile-card" style={{ textAlign:'center', color:'var(--text-muted)', padding:24, marginBottom:0 }}>
                        No activity recorded yet for {student.name}.
                      </div>
                    )}
                    {notifications.map((n, i) => (
                      <div key={n.id} style={{ display:'flex', gap:12 }}>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                          <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
                            background: n.type==='EMERGENCY' ? 'rgba(239,68,68,0.15)' : n.type==='WARNING' ? 'var(--warning-bg)' : 'var(--success-bg)',
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                            {n.type==='EMERGENCY' ? '' : n.type==='WARNING' ? '️' : ''}
                          </div>
                          {i < notifications.length-1 && <div style={{ width:2, flex:1, background:'var(--surface-border)', marginTop:4 }} />}
                        </div>
                        <div style={{ flex:1, paddingBottom:8 }}>
                          <div style={{ fontSize:14, fontWeight:600, color:'var(--text-main)' }}>{n.title}</div>
                          {n.body && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{n.body}</div>}
                          <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:4 }}>{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {students.length === 0 && (
                <div className="mobile-card" style={{ textAlign:'center', padding:32 }}>
                  <div style={{ fontSize:36 }}></div>
                  <div style={{ fontWeight:600, marginTop:8 }}>No child linked yet</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>Contact your school admin to link your child&apos;s account.</div>
                </div>
              )}
            </motion.div>
          )}


          {/* ── MESSAGES TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'MESSAGES' && (
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
              <AnimatePresence>
                {msgToast && (
                  <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                    style={{ padding:'0.75rem 1rem', background: msgToast.startsWith('') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      border:`1px solid ${msgToast.startsWith('') ? 'var(--success)' : 'var(--danger)'}`,
                      borderRadius:12, color:'var(--text-main)', fontWeight:500, marginBottom:12, fontSize:14 }}>
                    {msgToast}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Compose */}
              <div className="mobile-card" style={{ marginBottom:14 }}>
                <h3 style={{ margin:'0 0 12px 0', fontSize:'15px' }}>️ Send message to school</h3>
                <textarea className="input-field"
                  placeholder="e.g. My child is sick today and won&apos;t be attending school. Please inform the driver."
                  value={msgContent} onChange={e => setMsgContent(e.target.value)} rows={3}
                  style={{ resize:'none', fontFamily:'inherit', lineHeight:'1.5', fontSize:14, background:'rgba(0,0,0,0.2)' }} />
                <motion.button whileTap={{ scale:0.97 }} onClick={sendMessage} disabled={sending}
                  style={{ marginTop:10, width:'100%', padding:'12px', background:'linear-gradient(135deg,#4f46e5,#6366f1)', color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:14, cursor:'pointer' }}>
                  {sending ? 'Sending…' : 'Send to School Admin'}
                </motion.button>
              </div>

              {/* Messages list */}
              <h3 style={{ fontSize:'15px', margin:'0 0 10px 0' }}>Inbox</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {messages.slice(0,10).map(m => (
                  <motion.div key={m.id} initial={{ opacity:0 }} animate={{ opacity:1 }}
                    style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)', borderRadius:12,
                      borderLeft:'3px solid var(--primary)', border:'1px solid var(--surface-border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <strong style={{ fontSize:13 }}>{m.sender.name}</strong>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date(m.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,0.8)', lineHeight:'1.5' }}>{m.content}</p>
                  </motion.div>
                ))}
                {messages.length === 0 && <div style={{ textAlign:'center', color:'var(--text-muted)', padding:20 }}>No messages yet</div>}
              </div>
            </motion.div>
          )}

          {/* ── PROFILE TAB ───────────────────────────────────────────────────── */}
          {activeTab === 'PROFILE' && (
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
              {students.map(student => (
                <div key={student.id} className="mobile-card" style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 16px', marginBottom:14 }}>
                  <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#FFD100,#F5A623)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontWeight:800, color:'#111', marginBottom:12, boxShadow:'0 8px 20px rgba(255,209,0,0.3)' }}>
                    {student.photoUrl ? <Image src={student.photoUrl} alt="" width={80} height={80} style={{ objectFit:'cover', borderRadius:'50%' }} /> : student.name.charAt(0)}
                  </div>
                  <h2 style={{ margin:0, fontSize:'20px', color:'var(--text-main)' }}>{student.name}</h2>
                  <div style={{ fontSize:'14px', color:'var(--text-muted)', marginTop:4 }}>{student.grade} · Level {student.level}</div>

                  {/* Gamification summary */}
                  <div className="streak-card" style={{ width:'100%', marginTop:16, textAlign:'center' }}>
                    <div style={{ fontSize:13, color:'var(--text-muted)' }}>Rider Level</div>
                    <div style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--bus-yellow)' }}>Level {level} — {getLevelLabel(level)}</div>
                    <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{xp} XP total · {100-xpInLevel} XP to next level</div>
                    <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:10, flexWrap:'wrap' }}>
                      {BADGES.map((b, i) => (
                        <motion.div key={b.id} whileHover={{ scale:1.2 }} title={b.label}
                          style={{ fontSize:22, filter: i<earnedBadges.length ? 'none' : 'grayscale(1) opacity(0.3)', cursor:'default' }}>
                          {b.icon}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ background:'var(--surface)', border:'1px solid var(--surface-border)', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                {[
                  { icon:<User size={20}/>, label:'Personal Information', onClick: () => setProfilePanel(p => p === 'INFO' ? null : 'INFO') },
                  { icon:<Settings size={20}/>, label:'Settings & Preferences', onClick: () => showProfileNotice('Settings & Preferences is coming soon') },
                  { icon:<Bell size={20}/>, label:'Notification Settings', onClick: () => showProfileNotice('Notification Settings is coming soon — see Home for your activity feed') },
                  { icon:<HelpCircle size={20}/>, label:'Help Center', onClick: () => setProfilePanel(p => p === 'HELP' ? null : 'HELP') },
                ].map(({ icon, label, onClick }, i, arr) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', padding:'18px 16px', borderBottom: i<arr.length-1 ? '1px solid var(--surface-border)' : 'none', cursor:'pointer' }}
                    onClick={onClick}>
                    <span style={{ fontSize:20, marginRight:14 }}>{icon}</span>
                    <div style={{ flex:1, fontSize:'15px', fontWeight:500 }}>{label}</div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                      style={{ transform: (label === 'Personal Information' && profilePanel === 'INFO') || (label === 'Help Center' && profilePanel === 'HELP') ? 'rotate(90deg)' : 'none', transition:'transform 0.15s' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                ))}
                <div onClick={handleLogout} style={{ display:'flex', alignItems:'center', padding:'18px 16px', cursor:'pointer', background:'rgba(239,68,68,0.05)' }}>
                  <span style={{ display:'flex', marginRight:14 }}><LogOut size={20} color="var(--danger)"/></span>
                  <div style={{ flex:1, fontSize:'15px', fontWeight:500, color:'var(--danger)' }}>Log Out</div>
                </div>
              </div>

              {profileNotice && (
                <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
                  style={{ marginTop:10, padding:'10px 14px', borderRadius:10, background:'var(--surface-2)', color:'var(--text-muted)', fontSize:13, textAlign:'center' }}>
                  {profileNotice}
                </motion.div>
              )}

              {profilePanel === 'INFO' && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} className="mobile-card" style={{ padding:'18px 16px', marginTop:10 }}>
                  {me ? (
                    <div style={{ display:'grid', gap:10 }}>
                      <div><div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Name</div><div style={{ fontSize:15, fontWeight:600 }}>{me.name}</div></div>
                      <div><div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Email</div><div style={{ fontSize:15 }}>{me.email}</div></div>
                      {me.phone && <div><div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Phone</div><div style={{ fontSize:15 }}>{me.phone}</div></div>}
                      <div style={{ fontSize:12, color:'var(--text-dim)', marginTop:4 }}>Contact the school (via Messages) to update your details.</div>
                    </div>
                  ) : <div style={{ color:'var(--text-muted)', fontSize:14 }}>Loading…</div>}
                </motion.div>
              )}

              {profilePanel === 'HELP' && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} className="mobile-card" style={{ padding:'18px 16px', marginTop:10 }}>
                  <div style={{ fontSize:14, lineHeight:1.6, color:'var(--text-main)' }}>
                    Need help with pickup times, routes, or your child&apos;s account? Use the <strong>Messages</strong> tab to reach the transport office directly — that&apos;s the fastest way to get a response.
                  </div>
                </motion.div>
              )}

              {/* Language Selector */}
              <div className="mobile-card" style={{ padding:'16px', marginTop:14 }}>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}><Globe size={18}/> Language / Bahasa / 语言</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {[
                    { code:'en' as const, label:'EN', fullName:'English' },
                    { code:'ms' as const, label:'MS', fullName:'Bahasa Malaysia' },
                    { code:'zh' as const, label:'ZH', fullName:'中文' },
                  ].map(l => (
                    <motion.button key={l.code} whileTap={{ scale:0.95 }}
                      onClick={() => setLocale(l.code)}
                      style={{ padding:'8px 14px', background: locale === l.code ? 'var(--primary)' : 'var(--surface-2)', color: locale === l.code ? '#fff' : 'var(--text-main)', border: locale === l.code ? 'none' : '1px solid var(--surface-border)', borderRadius:8, cursor:'pointer', fontWeight: locale === l.code ? 700 : 500, fontSize:13 }}>
                      {l.label} <span style={{ opacity:0.6, fontSize:11, marginLeft:4 }}>{l.fullName}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Bottom Navigation */}
        <div className="mobile-nav">
          {NAV_TABS.map(tab => {
            const isActive = activeTab === tab.key
            const color = isActive ? 'var(--bus-yellow)' : '#BDBDBD'
            return (
              <button key={tab.key} className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)} style={{ position:'relative' }}>
                {tab.icon(color)}
                <span style={{ color }}>{tab.label}</span>
                {tab.key === 'MESSAGES' && messages.filter(m=>!m.read).length > 0 && (
                  <span style={{ position:'absolute', top:6, right:'50%', transform:'translateX(8px)', background:'var(--danger)', borderRadius:'50%', width:8, height:8, display:'block' }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
