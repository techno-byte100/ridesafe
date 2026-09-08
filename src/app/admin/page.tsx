'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import OverviewTab from '@/components/admin/OverviewTab'
import AttendanceTab from '@/components/admin/AttendanceTab'
import UsersTab from '@/components/admin/UsersTab'
import StudentsTab from '@/components/admin/StudentsTab'
import FleetTab from '@/components/admin/FleetTab'
import LiveTripsTab from '@/components/admin/LiveTripsTab'
import MessagesTab from '@/components/admin/MessagesTab'
import AnalyticsTab from '@/components/admin/AnalyticsTab'
import ScheduleTab from '@/components/admin/ScheduleTab'
import MaintenanceTab from '@/components/admin/MaintenanceTab'
import LostFoundTab from '@/components/admin/LostFoundTab'
import AnnouncementsTab from '@/components/admin/AnnouncementsTab'
import TripHistoryTab from '@/components/admin/TripHistoryTab'
import RouteOptimizationTab from '@/components/admin/RouteOptimizationTab'
import AcademicCalendarTab from '@/components/admin/AcademicCalendarTab'
import OrganizationsTab from '@/components/admin/OrganizationsTab'
import { LanguageSwitcher, useTranslation } from '@/i18n/provider'
import {
  LogOut, Menu, X,
  LayoutDashboard, Bus, GraduationCap, MapPin, CalendarDays, History,
  Users2, Wrench, Package, Megaphone, TrendingUp, Sparkles, MessageSquare, Bell,
  Building2, ShieldCheck, ClipboardCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const HC = {
  bg:         '#08080A',
  bgSoft:     '#0E0E11',
  surface:    '#141417',
  surface2:   '#1C1C21',
  line:       '#26262C',
  lineStrong: '#3A3A43',
  text:       '#FFFFFF',
  text2:      '#A6A6B2',
  text3:      '#6E6E7A',
  yellow:     '#FFD60A',
  onYellow:   '#08080A',
  danger:     '#FF453A',
  dangerBg:   'rgba(255,69,58,0.12)',
  r:          '12px',
  pill:       '9999px',
}

type SidebarGroup = { label: string; items: { id: string; icon: LucideIcon; label: string }[] }

function buildSidebarGroups(t: (k: string) => string): SidebarGroup[] {
  return [
    {
      label: t('nav.groupOperations'),
      items: [
        { id: 'OVERVIEW',    icon: LayoutDashboard, label: t('nav.overview') },
        { id: 'FLEET',       icon: Bus,             label: t('nav.fleet') },
        { id: 'STUDENTS',    icon: GraduationCap,   label: t('nav.students') },
        { id: 'ATTENDANCE',  icon: ClipboardCheck,  label: t('nav.attendance') },
        { id: 'LIVETRIPS',   icon: MapPin,          label: t('nav.liveTrips') },
        { id: 'SCHEDULE',    icon: CalendarDays,    label: t('nav.schedule') },
        { id: 'HISTORY',     icon: History,         label: t('nav.history') },
      ],
    },
    {
      label: t('nav.groupManagement'),
      items: [
        { id: 'USERS',         icon: Users2,    label: t('nav.users') },
        { id: 'MAINTENANCE',   icon: Wrench,    label: t('nav.maintenance') },
        { id: 'LOSTFOUND',     icon: Package,   label: t('nav.lostFound') },
        { id: 'ANNOUNCEMENTS', icon: Megaphone, label: t('nav.announcements') },
      ],
    },
    {
      label: t('nav.groupIntelligence'),
      items: [
        { id: 'ANALYTICS', icon: TrendingUp,    label: t('nav.analytics') },
        { id: 'OPTIMIZE',  icon: Sparkles,      label: t('nav.aiOptimize') },
        { id: 'MESSAGES',  icon: MessageSquare, label: t('nav.messages') },
        { id: 'CALENDAR',  icon: Bell,          label: t('nav.academicCalendar') },
      ],
    },
  ]
}

function SidebarItem({ icon: Icon, label, active, onClick }: {
  icon: LucideIcon; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: HC.r,
        cursor: 'pointer', width: '100%', textAlign: 'left',
        fontWeight: 600, fontSize: 13.5, border: 'none',
        color: active ? HC.onYellow : HC.text2,
        background: active ? HC.yellow : 'transparent',
        transition: 'background 0.15s ease, color 0.15s ease',
        fontFamily: 'inherit',
      }}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      {label}
    </button>
  )
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab]             = useState('OVERVIEW')
  const [searchQuery, setSearchQuery]         = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [userName, setUserName]               = useState<string>('')
  const [loading, setLoading]                 = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut]           = useState(false)
  const [sidebarOpen, setSidebarOpen]         = useState(false)
  const [isMobile, setIsMobile]               = useState(false)
  const router = useRouter()
  const { t } = useTranslation()

  const SIDEBAR_GROUPS = buildSidebarGroups(t)
  const TAB_LABELS: Record<string, string> = {
    OVERVIEW: t('nav.overview'), FLEET: t('nav.fleet'), STUDENTS: t('nav.students'),
    ATTENDANCE: t('nav.attendance'),
    LIVETRIPS: t('nav.liveTrips'), SCHEDULE: t('nav.schedule'), HISTORY: t('nav.history'),
    USERS: t('nav.users'), MAINTENANCE: t('nav.maintenance'), LOSTFOUND: t('nav.lostFound'),
    ANNOUNCEMENTS: t('nav.announcements'), ANALYTICS: t('nav.analytics'),
    OPTIMIZE: t('nav.aiOptimize'), MESSAGES: t('nav.messages'), CALENDAR: t('nav.academicCalendar'),
    ORGANIZATIONS: t('nav.organisations'),
  }
  const SUPER_ADMIN_ITEMS: { id: string; icon: LucideIcon; label: string }[] = [
    { id: 'ORGANIZATIONS', icon: Building2,   label: t('nav.organisations') },
    { id: 'SUPERUSERS',    icon: ShieldCheck, label: t('nav.allUsersGlobal') },
  ]

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => { if (!res.ok) throw new Error('Unauthorized'); return res.json() })
      .then(data => {
        const role = data.user?.role
        if (role === 'SUPER_ADMIN') {
          router.push('/super-admin')
          return
        }
        if (role === 'SCHOOL_ADMIN') {
          router.push('/school-admin')
          return
        }
        setCurrentUserRole(role || '')
        setUserName(data.user?.name || 'Admin')
        setLoading(false)
      })
      .catch(() => router.push('/'))
  }, [router])

  const handleLogout = async () => {
    setLoggingOut(true)
    await fetch('/api/auth/me', { method: 'POST' })
    router.push('/')
  }

  const handleNavClick = (id: string) => {
    setActiveTab(id)
    setSearchQuery('')
    if (isMobile) setSidebarOpen(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${HC.yellow}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <span style={{ color: HC.text2, fontSize: '0.95rem' }}>Loading dashboard…</span>
    </div>
  )

  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' })
  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 20px', borderBottom: `1px solid ${HC.line}`, marginBottom: 8 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 8, padding: '5px 9px', display: 'inline-flex', flexShrink: 0 }}>
          <Image src="/ridesafe-logo.png" alt="RideSafe" width={140} height={99} style={{ width: 'auto', height: 22 }} />
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: HC.text3, cursor: 'pointer', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* SUPER_ADMIN section */}
      {currentUserRole === 'SUPER_ADMIN' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: HC.yellow, padding: '8px 14px 6px', textTransform: 'uppercase', opacity: 0.85 }}>
            Super Admin
          </div>
          {SUPER_ADMIN_ITEMS.map(item => (
            <SidebarItem key={item.id} icon={item.icon} label={item.label} active={activeTab === item.id} onClick={() => handleNavClick(item.id)} />
          ))}
          <div style={{ height: 1, background: HC.line, margin: '8px 14px' }} />
        </div>
      )}

      {/* Nav groups */}
      {SIDEBAR_GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: HC.text3, padding: '8px 14px 6px', textTransform: 'uppercase' }}>
            {group.label}
          </div>
          {group.items.map(item => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => handleNavClick(item.id)}
            />
          ))}
        </div>
      ))}

      {/* User card */}
      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${HC.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: HC.r, background: HC.surface }}>
          <span style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #FFD60A, #F5A623)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: HC.onYellow, fontSize: 13,
          }}>{initials}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: HC.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
            <div style={{ fontSize: 11, color: HC.text3 }}>{currentUserRole.replace(/_/g, ' ')}</div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div style={{ margin: '-2rem -2rem -2rem', height: 'calc(100vh - 70px)', display: 'flex', background: HC.bg, overflow: 'hidden' }}>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 998, backdropFilter: 'blur(2px)' }}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <div style={{
        width: 240, flexShrink: 0,
        borderRight: `1px solid ${HC.line}`,
        background: HC.bgSoft,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        padding: '20px 14px',
        height: '100%',
        // Mobile: fixed slide-out drawer
        ...(isMobile ? {
          position: 'fixed' as const,
          top: 0, left: 0, bottom: 0, zIndex: 999,
          height: '100vh',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
          boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none',
        } : {}),
      }}>
        {sidebarContent}
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16,
          padding: isMobile ? '14px 16px' : '18px 28px',
          borderBottom: `1px solid ${HC.line}`,
          background: HC.bgSoft,
          flexShrink: 0,
        }}>
          {/* Hamburger on mobile */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: HC.text2, cursor: 'pointer', display: 'flex', padding: 6, borderRadius: 8, flexShrink: 0 }}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          )}

          {/* Title */}
          <div style={{ minWidth: 0 }}>
            {!isMobile && (
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: HC.yellow }}>
                Live · {dateLabel}
              </div>
            )}
            <h2 style={{
              fontFamily: 'var(--font-sora, Sora, system-ui)',
              fontSize: isMobile ? 17 : 21, fontWeight: 700, color: HC.text,
              letterSpacing: '-0.025em', marginTop: isMobile ? 0 : 3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {TAB_LABELS[activeTab] || activeTab}
            </h2>
          </div>

          {/* Global Search Bar */}
          {!isMobile && (() => {
            const searchable = ['STUDENTS', 'USERS', 'SUPERUSERS', 'FLEET'].includes(activeTab)
            
            // Generate quick jump suggestions if query matches any tab label
            const jumpSuggestions = searchQuery 
              ? Object.entries(TAB_LABELS)
                  .filter(([_, label]) => label.toLowerCase().includes(searchQuery.toLowerCase()) && !searchable)
                  .slice(0, 3)
              : []

            return (
              <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px',
                  background: HC.surface, border: `1px solid ${isSearchFocused ? HC.yellow : HC.line}`,
                  borderRadius: HC.pill, width: 220, transition: 'all 0.2s ease',
                  boxShadow: isSearchFocused ? `0 0 0 2px ${HC.yellow}33` : 'none'
                }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={isSearchFocused ? HC.yellow : HC.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    placeholder={searchable ? `${t('common.search')} ${TAB_LABELS[activeTab]}...` : t('common.search')}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: HC.text, fontFamily: 'inherit' }}
                  />
                </div>

                {/* Global Search Dropdown */}
                <AnimatePresence>
                  {isSearchFocused && searchQuery && !searchable && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                      style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 8,
                        background: HC.surface, border: `1px solid ${HC.line}`, borderRadius: 12,
                        width: 260, zIndex: 100, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                      }}
                    >
                      <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: HC.text3, borderBottom: `1px solid ${HC.lineStrong}` }}>
                        Global Search Options
                      </div>
                      <div style={{ padding: '4px' }}>
                        <button
                          onClick={() => { setActiveTab('STUDENTS'); setSearchQuery(searchQuery); }}
                          style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: HC.text, fontSize: 13, cursor: 'pointer', borderRadius: 8 }}
                          onMouseOver={e => e.currentTarget.style.background = HC.lineStrong}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          Search <span style={{ color: HC.yellow }}>&quot;{searchQuery}&quot;</span> in <strong>Students</strong>
                        </button>
                        <button
                          onClick={() => { setActiveTab('USERS'); setSearchQuery(searchQuery); }}
                          style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: HC.text, fontSize: 13, cursor: 'pointer', borderRadius: 8 }}
                          onMouseOver={e => e.currentTarget.style.background = HC.lineStrong}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          Search <span style={{ color: HC.yellow }}>&quot;{searchQuery}&quot;</span> in <strong>Users</strong>
                        </button>
                        <button
                          onClick={() => { setActiveTab('FLEET'); setSearchQuery(searchQuery); }}
                          style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: HC.text, fontSize: 13, cursor: 'pointer', borderRadius: 8 }}
                          onMouseOver={e => e.currentTarget.style.background = HC.lineStrong}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          Search <span style={{ color: HC.yellow }}>&quot;{searchQuery}&quot;</span> in <strong>Fleet</strong>
                        </button>
                        
                        {jumpSuggestions.map(([id, label]) => (
                           <button
                             key={id}
                             onClick={() => { setActiveTab(id); setSearchQuery(''); }}
                             style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: HC.text, fontSize: 13, cursor: 'pointer', borderRadius: 8 }}
                             onMouseOver={e => e.currentTarget.style.background = HC.lineStrong}
                             onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                           >
                             Jump to <strong>{label}</strong>
                           </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })()}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: isMobile ? 'auto' : 0 }}>
            {!isMobile && <LanguageSwitcher />}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={() => setShowLogoutConfirm(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 7,
                padding: isMobile ? '8px' : '9px 16px',
                borderRadius: isMobile ? '50%' : HC.pill,
                background: HC.dangerBg, color: HC.danger,
                border: `1px solid rgba(255,69,58,0.22)`,
                fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit',
                width: isMobile ? 36 : 'auto', height: isMobile ? 36 : 'auto',
                justifyContent: 'center',
              }}
              title="Logout"
            >
              <LogOut size={isMobile ? 16 : 15} />
              {!isMobile && t('common.logout')}
            </motion.button>
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: isMobile ? '16px' : '24px 28px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === 'OVERVIEW'      && <OverviewTab currentUserRole={currentUserRole} />}
              {activeTab === 'ANALYTICS'     && <AnalyticsTab />}
              {activeTab === 'USERS'         && <UsersTab searchQuery={searchQuery} />}
              {activeTab === 'STUDENTS'      && <StudentsTab searchQuery={searchQuery} />}
              {activeTab === 'ATTENDANCE'    && <AttendanceTab />}
              {activeTab === 'FLEET'         && <FleetTab searchQuery={searchQuery} />}
              {activeTab === 'LIVETRIPS'     && <LiveTripsTab />}
              {activeTab === 'HISTORY'       && <TripHistoryTab />}
              {activeTab === 'SCHEDULE'      && <ScheduleTab />}
              {activeTab === 'MAINTENANCE'   && <MaintenanceTab />}
              {activeTab === 'LOSTFOUND'     && <LostFoundTab />}
              {activeTab === 'ANNOUNCEMENTS' && <AnnouncementsTab />}
              {activeTab === 'OPTIMIZE'       && <RouteOptimizationTab />}
              {activeTab === 'MESSAGES'       && <MessagesTab />}
              {activeTab === 'CALENDAR'       && <AcademicCalendarTab />}
              {activeTab === 'ORGANIZATIONS'  && <OrganizationsTab />}
              {activeTab === 'SUPERUSERS'     && <UsersTab currentUserRole={currentUserRole} searchQuery={searchQuery} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Logout confirmation modal ── */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={e => { if (e.target === e.currentTarget) setShowLogoutConfirm(false) }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{ background: HC.surface, border: `1px solid ${HC.line}`, borderRadius: '20px', padding: '2rem', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
            >
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: HC.dangerBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <LogOut size={24} color={HC.danger} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-sora, Sora, system-ui)', fontSize: 20, marginBottom: '0.5rem', color: HC.text }}>{t('common.confirm')} {t('common.logout')}</h3>
              <p style={{ color: HC.text2, fontSize: 14, marginBottom: '1.75rem', lineHeight: 1.55 }}>
                Are you sure you want to log out?
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  style={{ flex: 1, padding: '11px', borderRadius: HC.pill, background: HC.surface2, border: `1px solid ${HC.line}`, color: HC.text, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={loggingOut}
                >
                  {t('common.cancel')}
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, padding: '11px', borderRadius: HC.pill, background: HC.danger, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? t('common.loading') : t('common.logout')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
