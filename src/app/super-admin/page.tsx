'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import SuperAdminOverviewTab from '@/components/super-admin/OverviewTab'
import OrganizationsTab from '@/components/super-admin/OrganizationsTab'
import SuperUsersTab from '@/components/super-admin/SuperUsersTab'
import StudentsTab from '@/components/super-admin/StudentsTab'
import SuperAdminSystemSettingsTab from '@/components/super-admin/SystemSettingsTab'
import AuditLogTab from '@/components/super-admin/AuditLogTab'
import GlobalAnalyticsTab from '@/components/super-admin/GlobalAnalyticsTab'
import { LanguageSwitcher, useTranslation } from '@/i18n/provider'
import {
  LogOut, Menu, X, ShieldAlert,
  LayoutDashboard, Users2, Building2, ShieldCheck, Settings,
  ArrowRight, Sparkles, Terminal, FileText, BarChart3, GraduationCap
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
  badge?: string
}

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('OVERVIEW')
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('Super Admin')
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()

  const NAV_ITEMS: NavItem[] = [
    { id: 'OVERVIEW',      icon: LayoutDashboard, label: t('superAdmin.overview') || 'Platform Overview' },
    { id: 'ORGANIZATIONS', icon: Building2,       label: t('superAdmin.schools') || 'Schools & Tenants', badge: 'Tenants' },
    { id: 'USERS',         icon: ShieldCheck,     label: t('superAdmin.users') || 'Global User Directory', badge: 'RBAC' },
    { id: 'STUDENTS',      icon: GraduationCap,   label: t('superAdmin.students') || 'Students & Enrolment', badge: 'Roster' },
    { id: 'ANALYTICS',     icon: BarChart3,       label: t('superAdmin.analytics') || 'Global Analytics', badge: 'KPIs' },
    { id: 'AUDIT_LOG',     icon: FileText,        label: t('superAdmin.auditLog') || 'Security Audit Trail', badge: 'Trail' },
    { id: 'SETTINGS',      icon: Settings,        label: t('superAdmin.settings') || 'Developer & System Settings' },
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
        if (role !== 'SUPER_ADMIN') {
          router.push('/')
          return
        }
        setCurrentUserRole(role)
        setUserName(data.user?.name || 'Master Super Admin')
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
        <span style={{ color: HC.text2, fontSize: 14 }}>Authenticating Super Admin Security Layer...</span>
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
        {/* Logo & Super Admin Shield */}
        <div style={{
          padding: '24px 20px', borderBottom: `1px solid ${HC.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: HC.yellow, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: HC.onYellow
            }}>
              <Terminal size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFF' }}>
                RideSafe <span style={{ color: HC.yellow }}>SA</span>
              </div>
              <div style={{ fontSize: 11, color: HC.yellow, fontWeight: 700, letterSpacing: '0.04em' }}>
                SUPER ADMIN
              </div>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: HC.text2 }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Super Admin Badge Info */}
        <div style={{ margin: '14px 16px 6px', padding: '10px 14px', background: HC.surface, borderRadius: 10, border: `1px solid ${HC.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#30D158' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#FFF' }}>{userName}</span>
          </div>
          <div style={{ fontSize: 11, color: HC.text3, marginTop: 3 }}>
            Full Developer & Tenant Privilege
          </div>
        </div>

        {/* Navigation list */}
        <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: HC.text3, padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Master Controls
          </div>
          {NAV_ITEMS.map(item => {
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
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', borderRadius: HC.r,
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  fontWeight: 600, fontSize: 13.5, border: 'none',
                  color: active ? HC.onYellow : HC.text2,
                  background: active ? HC.yellow : 'transparent',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={17} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: active ? 'rgba(0,0,0,0.15)' : HC.surface2,
                    color: active ? '#08080A' : HC.text3
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer & Language / Logout */}
        <div style={{ padding: 16, borderTop: `1px solid ${HC.line}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: HC.text3 }}>Language</span>
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
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
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
              {NAV_ITEMS.find(n => n.id === activeTab)?.label}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: HC.surface, border: `1px solid ${HC.line}`,
              padding: '6px 12px', borderRadius: HC.pill, fontSize: 12, color: HC.text2
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#30D158' }} />
              Super Admin Mode
            </div>
          </div>
        </header>

        {/* Tab Body */}
        <div style={{ flex: 1, padding: 24, maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          {activeTab === 'OVERVIEW' && (
            <SuperAdminOverviewTab onNavigateTab={(tab) => setActiveTab(tab)} />
          )}
          {activeTab === 'ORGANIZATIONS' && (
            <OrganizationsTab />
          )}
          {activeTab === 'USERS' && (
            <SuperUsersTab currentUserRole="SUPER_ADMIN" />
          )}
          {activeTab === 'STUDENTS' && (
            <StudentsTab />
          )}
          {activeTab === 'ANALYTICS' && (
            <GlobalAnalyticsTab />
          )}

          {activeTab === 'AUDIT_LOG' && (
            <AuditLogTab />
          )}
          {activeTab === 'SETTINGS' && (
            <SuperAdminSystemSettingsTab />
          )}
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
                Sign out of Super Admin Console?
              </h3>
              <p style={{ color: HC.text2, fontSize: 13, margin: '0 0 20px' }}>
                You will need to sign back in with master credentials to access system settings.
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
                  Cancel
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
                  {loggingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
