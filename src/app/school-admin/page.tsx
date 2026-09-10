'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import OverviewTab from '@/components/school-admin/OverviewTab'
import ScheduleTab from '@/components/school-admin/ScheduleTab'
import TripHistoryTab from '@/components/school-admin/TripHistoryTab'
import StudentsTab from '@/components/admin/StudentsTab'
import UsersTab from '@/components/admin/UsersTab'
import AcademicCalendarTab from '@/components/school-admin/AcademicCalendarTab'
import AnnouncementsTab from '@/components/school-admin/AnnouncementsTab'
import AnalyticsTab from '@/components/school-admin/AnalyticsTab'
import { LanguageSwitcher, useTranslation } from '@/i18n/provider'
import {
  LogOut, Menu, X,
  LayoutDashboard, CalendarDays, History,
  Megaphone, TrendingUp, Bell, Building,
  GraduationCap, Users, Car
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

interface NavItem {
  id: string
  icon: LucideIcon
  label: string
}

export default function SchoolAdminDashboard() {
  const [activeTab, setActiveTab] = useState('OVERVIEW')
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('School Admin')
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()

  const NAV_ITEMS: { category: string; items: NavItem[] }[] = [
    {
      category: t('schoolAdmin.navGroupEnrollment'),
      items: [
        { id: 'STUDENTS', icon: GraduationCap, label: t('schoolAdmin.students') },
        { id: 'PARENTS',  icon: Users,         label: t('schoolAdmin.parents') },
        { id: 'DRIVERS',  icon: Car,           label: t('schoolAdmin.drivers') },
      ]
    },
    {
      category: t('schoolAdmin.navGroupOperations'),
      items: [
        { id: 'OVERVIEW',  icon: LayoutDashboard, label: t('nav.overview') },
        { id: 'SCHEDULE',  icon: CalendarDays,    label: t('nav.schedule') },
        { id: 'HISTORY',   icon: History,         label: t('nav.history') },
      ]
    },
    {
      category: t('schoolAdmin.navGroupIntelligence'),
      items: [
        { id: 'CALENDAR',      icon: Bell,       label: t('nav.academicCalendar') },
        { id: 'ANNOUNCEMENTS', icon: Megaphone,  label: t('nav.announcements') },
        { id: 'ANALYTICS',     icon: TrendingUp, label: t('nav.analytics') },
      ]
    }
  ]

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => { 
        if (!res.ok) throw new Error('Unauthorized')
        return res.json() 
      })
      .then(data => {
        const role = data.user?.role
        if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
          if (role === 'ADMIN') router.push('/admin')
          else if (role === 'DRIVER') router.push('/driver')
          else if (role === 'PARENT') router.push('/parent')
          else router.push('/')
          return
        }
        setCurrentUserRole(role)
        setUserName(data.user?.name || 'School Principal')
        setLoading(false)
      })
      .catch(() => router.push('/'))
  }, [router])

  const handleLogout = async () => {
    setLoggingOut(true)
    await fetch('/api/auth/me', { method: 'POST' })
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: HC.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid #26262C', borderTopColor: HC.yellow,
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: HC.text2, fontSize: 14 }}>{t('schoolAdmin.loadingConsole')}</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: HC.bg, color: HC.text,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    }}>
      {/* Mobile Drawer Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)'
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 270, flexShrink: 0,
        background: HC.bgSoft,
        borderRight: `1px solid ${HC.line}`,
        display: 'flex', flexDirection: 'column',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0, bottom: 0, height: '100vh',
        zIndex: 101,
        transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'none',
        transition: 'transform 0.25s ease',
        overflowY: 'auto'
      }}>
        <div style={{
          padding: '24px 20px', borderBottom: `1px solid ${HC.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: '#0A84FF', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#FFF'
            }}>
              <Building size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFF' }}>
                RideSafe
              </div>
              <div style={{ fontSize: 11, color: '#0A84FF', fontWeight: 700, letterSpacing: '0.04em' }}>
                SCHOOL ADMIN
              </div>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: HC.text2 }}>
              <X size={20} />
            </button>
          )}
        </div>

        <div style={{ margin: '14px 16px 6px', padding: '10px 14px', background: HC.surface, borderRadius: 10, border: `1px solid ${HC.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0A84FF' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#FFF' }}>{userName}</span>
          </div>
          <div style={{ fontSize: 11, color: HC.text3, marginTop: 3 }}>
            {t('schoolAdmin.transportOpsRole')}
          </div>
        </div>

        <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {NAV_ITEMS.map((group, gIdx) => (
            <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: HC.text3, padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {group.category}
              </div>
              {group.items.map(item => {
                const Icon = item.icon
                const active = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id)
                      if (isMobile) setSidebarOpen(false)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: HC.r,
                      cursor: 'pointer', width: '100%', textAlign: 'left',
                      fontWeight: 600, fontSize: 13.5, border: 'none',
                      color: active ? HC.onYellow : HC.text2,
                      background: active ? HC.yellow : 'transparent',
                      transition: 'background 0.15s ease, color 0.15s ease',
                    }}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div style={{ padding: 16, borderTop: `1px solid ${HC.line}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: HC.text3 }}>{t('schoolAdmin.language')}</span>
            <LanguageSwitcher />
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: HC.r,
              background: 'transparent', border: `1px solid ${HC.line}`,
              color: HC.danger, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', width: '100%', justifyContent: 'center'
            }}
          >
            <LogOut size={15} /> {t('schoolAdmin.signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          height: 64, borderBottom: `1px solid ${HC.line}`,
          background: HC.bgSoft, padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 90
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: 4 }}
              >
                <Menu size={22} />
              </button>
            )}
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#FFF', margin: 0 }}>
              {NAV_ITEMS.flatMap(g => g.items).find(i => i.id === activeTab)?.label || activeTab}
            </h1>
          </div>
        </header>

        <div style={{ flex: 1, padding: 24, maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          {activeTab === 'OVERVIEW' && <OverviewTab currentUserRole={currentUserRole} />}
          {activeTab === 'STUDENTS' && <StudentsTab />}
          {activeTab === 'PARENTS' && <UsersTab currentUserRole={currentUserRole} defaultRoleFilter="PARENT" lockRoleFilter={true} />}
          {activeTab === 'DRIVERS' && <UsersTab currentUserRole={currentUserRole} defaultRoleFilter="DRIVER" lockRoleFilter={true} />}
          {activeTab === 'SCHEDULE' && <ScheduleTab />}
          {activeTab === 'HISTORY' && <TripHistoryTab />}
          {activeTab === 'CALENDAR' && <AcademicCalendarTab />}
          {activeTab === 'ANNOUNCEMENTS' && <AnnouncementsTab />}
          {activeTab === 'ANALYTICS' && <AnalyticsTab />}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
          }}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{
                background: HC.surface, border: `1px solid ${HC.lineStrong}`,
                borderRadius: 16, padding: 24, maxWidth: 380, width: '100%'
              }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#FFF', margin: '0 0 8px' }}>
                {t('schoolAdmin.signOutTitle')}
              </h3>
              <p style={{ color: HC.text2, fontSize: 13, margin: '0 0 20px' }}>
                {t('schoolAdmin.signOutMessage')}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    background: 'transparent', border: `1px solid ${HC.line}`,
                    color: HC.text2, padding: '8px 16px', borderRadius: 8,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  style={{
                    background: HC.danger, border: 'none',
                    color: '#FFF', padding: '8px 16px', borderRadius: 8,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600
                  }}
                >
                  {loggingOut ? t('schoolAdmin.signingOut') : t('schoolAdmin.signOut')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
