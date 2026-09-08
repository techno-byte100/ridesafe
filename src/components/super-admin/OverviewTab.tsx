'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, Users, Bus, GraduationCap, Activity, ShieldCheck, 
  Server, Database, Wifi, AlertTriangle, CheckCircle, ArrowRight
} from 'lucide-react'
import { useTranslation } from '@/i18n/provider'

interface SystemStats {
  totalOrgs: number
  activeOrgs: number
  totalUsers: number
  totalStudents: number
  totalBuses: number
  activeTrips: number
}

interface EmergencyRecord { 
  id: string
  timestamp: string
  latitude?: number
  longitude?: number
  driver?: { name: string; phone?: string }
}

export default function SuperAdminOverviewTab({ onNavigateTab }: { onNavigateTab?: (tab: string) => void }) {
  const { t } = useTranslation()
  const [stats, setStats] = useState<SystemStats>({
    totalOrgs: 0,
    activeOrgs: 0,
    totalUsers: 0,
    totalStudents: 0,
    totalBuses: 0,
    activeTrips: 0
  })
  const [emergencies, setEmergencies] = useState<EmergencyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  const loadData = async () => {
    try {
      const [orgsRes, usersRes, studentsRes, tripsRes, emergencyRes] = await Promise.all([
        fetch('/api/admin/organizations'),
        fetch('/api/admin/users'),
        fetch('/api/students'),
        fetch('/api/trips'),
        fetch('/api/emergency')
      ])

      const orgsData = await orgsRes.json()
      const usersData = await usersRes.json()
      const studentsData = await studentsRes.json()
      const tripsData = await tripsRes.json()
      const emergencyData = await emergencyRes.json()

      const orgList = orgsData.organizations || []
      const userList = usersData.users || []
      const studentList = studentsData.students || []
      const tripList = tripsData.trips || []

      // Calculate totals
      let busCount = 0
      orgList.forEach((o: { _count?: { buses?: number } }) => {
        busCount += o._count?.buses || 0
      })

      setStats({
        totalOrgs: orgList.length,
        activeOrgs: orgList.filter((o: { isActive: boolean }) => o.isActive).length,
        totalUsers: userList.length,
        totalStudents: studentList.length,
        totalBuses: busCount,
        activeTrips: tripList.filter((tr: { status: string }) => tr.status === 'IN_PROGRESS').length
      })

      setEmergencies(emergencyData.alerts || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 8000)
    return () => clearInterval(interval)
  }, [])

  const handleResolveEmergency = async (id: string) => {
    try {
      const res = await fetch(`/api/emergency/${id}`, { method: 'PATCH' })
      if (res.ok) {
        setEmergencies(prev => prev.filter(e => e.id !== id))
        showToast('Emergency marked as resolved', 'success')
      } else {
        showToast('Failed to resolve emergency', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    }
  }

  const kpis = [
    {
      title: 'Active Schools / Tenants',
      value: stats.totalOrgs,
      sub: `${stats.activeOrgs} operational`,
      icon: Building2,
      color: '#FFD60A',
      tab: 'ORGANIZATIONS'
    },
    {
      title: 'Global Platform Users',
      value: stats.totalUsers,
      sub: 'Admins, drivers & parents',
      icon: Users,
      color: '#30D158',
      tab: 'USERS'
    },
    {
      title: 'Total Enrolled Students',
      value: stats.totalStudents,
      sub: 'Across all organizations',
      icon: GraduationCap,
      color: '#0A84FF',
      tab: 'ORGANIZATIONS'
    },
    {
      title: 'Live Active Trips',
      value: stats.activeTrips,
      sub: `${stats.totalBuses} total buses mapped`,
      icon: Bus,
      color: '#BF5AF2',
      tab: 'ORGANIZATIONS'
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: 24, right: 24, zIndex: 9999,
              padding: '12px 20px', borderRadius: 10,
              background: toastType === 'success' ? '#30D158' : '#FF453A',
              color: '#000', fontWeight: 600, fontSize: 14,
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            {toastType === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 214, 10, 0.12) 0%, rgba(20, 20, 23, 0.6) 100%)',
        border: '1px solid rgba(255, 214, 10, 0.25)',
        borderRadius: 16,
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{
              background: '#FFD60A', color: '#08080A',
              fontSize: 11, fontWeight: 800, padding: '3px 8px',
              borderRadius: 6, letterSpacing: '0.05em'
            }}>SUPER ADMIN CONSOLE</span>
            <span style={{ color: '#A6A6B2', fontSize: 13 }}>Platform Developer Control</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#FFF', margin: 0 }}>
            Global Operations Dashboard
          </h2>
          <p style={{ color: '#A6A6B2', fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Multi-tenant oversight, tenant quotas, security policies, and system-wide monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {onNavigateTab && (
            <>
              <button
                onClick={() => onNavigateTab('ORGANIZATIONS')}
                style={{
                  background: '#FFD60A', color: '#08080A',
                  border: 'none', padding: '10px 18px', borderRadius: 10,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <Building2 size={16} /> Manage Schools
              </button>
              <button
                onClick={() => onNavigateTab('USERS')}
                style={{
                  background: '#1C1C21', color: '#FFF',
                  border: '1px solid #26262C', padding: '10px 18px', borderRadius: 10,
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <Users size={16} /> Global Users
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16
      }}>
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={i}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              onClick={() => onNavigateTab && onNavigateTab(kpi.tab)}
              style={{
                background: '#141417',
                border: '1px solid #26262C',
                borderRadius: 14,
                padding: 20,
                cursor: onNavigateTab ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: '#A6A6B2', fontSize: 13, fontWeight: 500 }}>{kpi.title}</span>
                <div style={{
                  background: `${kpi.color}18`,
                  padding: 8, borderRadius: 8, color: kpi.color
                }}>
                  <Icon size={18} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#FFF' }}>
                  {loading ? '...' : kpi.value}
                </div>
                <div style={{ fontSize: 12, color: '#6E6E7A', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{kpi.sub}</span>
                  {onNavigateTab && <ArrowRight size={13} color="#A6A6B2" />}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* System Health & Global Emergencies */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20
      }}>
        {/* System Health / Status */}
        <div style={{
          background: '#141417',
          border: '1px solid #26262C',
          borderRadius: 14,
          padding: 22
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Server size={18} color="#FFD60A" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: 0 }}>
              Platform Infrastructure Status
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#1C1C21', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={16} color="#30D158" />
                <span style={{ fontSize: 13, color: '#FFF', fontWeight: 500 }}>PostgreSQL Database (Neon)</span>
              </div>
              <span style={{ fontSize: 12, color: '#30D158', fontWeight: 600, background: 'rgba(48,209,88,0.12)', padding: '3px 8px', borderRadius: 6 }}>Operational</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#1C1C21', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Wifi size={16} color="#30D158" />
                <span style={{ fontSize: 13, color: '#FFF', fontWeight: 500 }}>Upstash Redis Pub/Sub</span>
              </div>
              <span style={{ fontSize: 12, color: '#30D158', fontWeight: 600, background: 'rgba(48,209,88,0.12)', padding: '3px 8px', borderRadius: 6 }}>Connected</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#1C1C21', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={16} color="#30D158" />
                <span style={{ fontSize: 13, color: '#FFF', fontWeight: 500 }}>Role-Based Access Control (RBAC)</span>
              </div>
              <span style={{ fontSize: 12, color: '#30D158', fontWeight: 600, background: 'rgba(48,209,88,0.12)', padding: '3px 8px', borderRadius: 6 }}>Enforced</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#1C1C21', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={16} color="#0A84FF" />
                <span style={{ fontSize: 13, color: '#FFF', fontWeight: 500 }}>GPS Telematics Ingestion Engine</span>
              </div>
              <span style={{ fontSize: 12, color: '#0A84FF', fontWeight: 600, background: 'rgba(10,132,255,0.12)', padding: '3px 8px', borderRadius: 6 }}>Listening</span>
            </div>
          </div>
        </div>

        {/* Global Emergency Escalation Desk */}
        <div style={{
          background: '#141417',
          border: emergencies.length > 0 ? '1px solid #FF453A' : '1px solid #26262C',
          borderRadius: 14,
          padding: 22
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={18} color={emergencies.length > 0 ? '#FF453A' : '#A6A6B2'} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: 0 }}>
                System-Wide Emergency Escalation
              </h3>
            </div>
            <span style={{
              fontSize: 12, fontWeight: 700,
              padding: '2px 8px', borderRadius: 6,
              background: emergencies.length > 0 ? 'rgba(255,69,58,0.16)' : '#1C1C21',
              color: emergencies.length > 0 ? '#FF453A' : '#6E6E7A'
            }}>
              {emergencies.length} Active
            </span>
          </div>

          {emergencies.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '36px 12px', textAlign: 'center'
            }}>
              <CheckCircle size={36} color="#30D158" style={{ marginBottom: 10 }} />
              <span style={{ color: '#FFF', fontSize: 14, fontWeight: 600 }}>All Systems Clear</span>
              <span style={{ color: '#6E6E7A', fontSize: 12, marginTop: 4 }}>No unresolved SOS or emergency signals across any school fleet.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
              {emergencies.map(em => (
                <div
                  key={em.id}
                  style={{
                    background: 'rgba(255,69,58,0.08)',
                    border: '1px solid rgba(255,69,58,0.3)',
                    borderRadius: 8, padding: 12,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ color: '#FF453A', fontWeight: 700, fontSize: 13 }}>
                      SOS Signal: {em.driver?.name || 'Driver'}
                    </div>
                    <div style={{ color: '#A6A6B2', fontSize: 11, marginTop: 2 }}>
                      {new Date(em.timestamp).toLocaleTimeString()} • Phone: {em.driver?.phone || 'N/A'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveEmergency(em.id)}
                    style={{
                      background: '#FF453A', color: '#FFF', border: 'none',
                      padding: '6px 12px', borderRadius: 6, fontSize: 11,
                      fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
