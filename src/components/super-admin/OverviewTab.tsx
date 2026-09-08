'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, Users, Bus, GraduationCap, Activity, ShieldCheck, 
  Server, Database, Wifi, AlertTriangle, CheckCircle, ArrowRight,
  FileText, BarChart3, RefreshCw, Clock, ExternalLink
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

interface AuditLogRecord {
  id: string
  action: string
  target?: string
  createdAt: string
  user?: { name: string; email: string }
}

interface HealthCheckData {
  status: string
  checks: {
    database: { status: string; latencyMs: number; engine?: string }
    redis: { status: string; latencyMs: number; type?: string }
    rbac: { status: string; mode?: string }
    gpsIngestion: { status: string; activePort?: string }
  }
  maintenanceMode?: boolean
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
  const [recentLogs, setRecentLogs] = useState<AuditLogRecord[]>([])
  const [health, setHealth] = useState<HealthCheckData | null>(null)
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
      const results = await Promise.allSettled([
        fetch('/api/admin/organizations').then(r => r.ok ? r.json() : { organizations: [] }).catch(() => ({ organizations: [] })),
        fetch('/api/admin/users').then(r => r.ok ? r.json() : { users: [] }).catch(() => ({ users: [] })),
        fetch('/api/students').then(r => r.ok ? r.json() : { students: [] }).catch(() => ({ students: [] })),
        fetch('/api/trips').then(r => r.ok ? r.json() : { trips: [] }).catch(() => ({ trips: [] })),
        fetch('/api/emergency').then(r => r.ok ? r.json() : { alerts: [] }).catch(() => ({ alerts: [] })),
        fetch('/api/admin/audit-log?limit=6').then(r => r.ok ? r.json() : { logs: [] }).catch(() => ({ logs: [] })),
        fetch('/api/admin/health').then(r => r.ok ? r.json() : null).catch(() => null),
      ])

      const orgsData = results[0].status === 'fulfilled' ? results[0].value : { organizations: [] }
      const usersData = results[1].status === 'fulfilled' ? results[1].value : { users: [] }
      const studentsData = results[2].status === 'fulfilled' ? results[2].value : { students: [] }
      const tripsData = results[3].status === 'fulfilled' ? results[3].value : { trips: [] }
      const emergencyData = results[4].status === 'fulfilled' ? results[4].value : { alerts: [] }
      const logsData = results[5].status === 'fulfilled' ? results[5].value : { logs: [] }
      const healthData = results[6].status === 'fulfilled' ? results[6].value : null

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
      setRecentLogs(logsData.logs || [])
      if (healthData) setHealth(healthData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleResolveEmergency = async (id: string) => {
    try {
      const res = await fetch(`/api/emergency/${id}`, { method: 'PATCH' })
      if (res.ok) {
        setEmergencies(prev => prev.filter(e => e.id !== id))
        showToast(t('superAdmin.overviewPage.toastResolved'), 'success')
      } else {
        showToast(t('superAdmin.overviewPage.toastResolveFailed'), 'error')
      }
    } catch {
      showToast(t('superAdmin.overviewPage.toastNetworkError'), 'error')
    }
  }

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith('CREATE') || action.includes('ADD')) return { bg: 'rgba(48,209,88,0.15)', text: '#30D158' }
    if (action.startsWith('DELETE') || action.includes('REMOVE')) return { bg: 'rgba(255,69,58,0.15)', text: '#FF453A' }
    if (action.startsWith('UPDATE') || action.includes('TOGGLE')) return { bg: 'rgba(10,132,255,0.15)', text: '#0A84FF' }
    return { bg: 'rgba(255,214,10,0.15)', text: '#FFD60A' }
  }

  const kpis = [
    {
      title: t('superAdmin.overviewPage.kpiSchoolsTitle'),
      value: stats.totalOrgs,
      sub: t('superAdmin.overviewPage.kpiSchoolsSub', { count: stats.activeOrgs }),
      icon: Building2,
      color: '#FFD60A',
      tab: 'ORGANIZATIONS'
    },
    {
      title: t('superAdmin.overviewPage.kpiUsersTitle'),
      value: stats.totalUsers,
      sub: t('superAdmin.overviewPage.kpiUsersSub'),
      icon: Users,
      color: '#30D158',
      tab: 'USERS'
    },
    {
      title: t('superAdmin.overviewPage.kpiStudentsTitle'),
      value: stats.totalStudents,
      sub: t('superAdmin.overviewPage.kpiStudentsSub'),
      icon: GraduationCap,
      color: '#0A84FF',
      tab: 'STUDENTS'
    },
    {
      title: t('superAdmin.overviewPage.kpiTripsTitle'),
      value: stats.activeTrips,
      sub: t('superAdmin.overviewPage.kpiTripsSub', { count: stats.totalBuses }),
      icon: Bus,
      color: '#BF5AF2',
      tab: 'ANALYTICS'
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
            }}>{t('superAdmin.overviewPage.badge')}</span>
            <span style={{ color: '#A6A6B2', fontSize: 13 }}>{t('superAdmin.overviewPage.subBadge')}</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#FFF', margin: 0 }}>
            {t('superAdmin.overviewPage.title')}
          </h2>
          <p style={{ color: '#A6A6B2', fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            {t('superAdmin.overviewPage.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {onNavigateTab && (
            <>
              <button
                onClick={() => onNavigateTab('STUDENTS')}
                style={{
                  background: '#1C1C21', color: '#FFF',
                  border: '1px solid #26262C', padding: '10px 18px', borderRadius: 10,
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <GraduationCap size={16} color="#FFD60A" /> {t('superAdmin.overviewPage.studentsBtn')}
              </button>
              <button
                onClick={() => onNavigateTab('ANALYTICS')}
                style={{
                  background: '#1C1C21', color: '#FFF',
                  border: '1px solid #26262C', padding: '10px 18px', borderRadius: 10,
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <BarChart3 size={16} color="#0A84FF" /> {t('superAdmin.overviewPage.analyticsBtn')}
              </button>
              <button
                onClick={() => onNavigateTab('AUDIT_LOG')}
                style={{
                  background: '#1C1C21', color: '#FFF',
                  border: '1px solid #26262C', padding: '10px 18px', borderRadius: 10,
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <FileText size={16} color="#FFD60A" /> {t('superAdmin.overviewPage.auditBtn')}
              </button>
              <button
                onClick={() => onNavigateTab('ORGANIZATIONS')}
                style={{
                  background: '#FFD60A', color: '#08080A',
                  border: 'none', padding: '10px 18px', borderRadius: 10,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <Building2 size={16} /> {t('superAdmin.overviewPage.manageSchoolsBtn')}
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
        {/* System Health / Status with live checks */}
        <div style={{
          background: '#141417',
          border: '1px solid #26262C',
          borderRadius: 14,
          padding: 22
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Server size={18} color="#FFD60A" />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: 0 }}>
                {t('superAdmin.overviewPage.infraTitle')}
              </h3>
            </div>
            <button
              onClick={loadData}
              title={t('superAdmin.overviewPage.refreshTooltip')}
              style={{ background: 'transparent', border: 'none', color: '#A6A6B2', cursor: 'pointer', padding: 4 }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#1C1C21', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={16} color={health?.checks?.database?.status === 'operational' ? '#30D158' : '#FF9F0A'} />
                <div>
                  <span style={{ fontSize: 13, color: '#FFF', fontWeight: 500 }}>PostgreSQL Database (Neon)</span>
                  {health?.checks?.database?.latencyMs !== undefined && (
                    <span style={{ fontSize: 11, color: '#6E6E7A', marginLeft: 8 }}>
                      {health.checks.database.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>
              <span style={{
                fontSize: 12,
                color: health?.checks?.database?.status === 'operational' ? '#30D158' : '#FF9F0A',
                fontWeight: 600,
                background: health?.checks?.database?.status === 'operational' ? 'rgba(48,209,88,0.12)' : 'rgba(255,159,10,0.12)',
                padding: '3px 8px', borderRadius: 6
              }}>
                {health?.checks?.database?.status === 'operational' ? t('superAdmin.overviewPage.opStatusOperational') : t('superAdmin.overviewPage.opStatusActive')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#1C1C21', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Wifi size={16} color="#30D158" />
                <div>
                  <span style={{ fontSize: 13, color: '#FFF', fontWeight: 500 }}>Redis Telemetry / PubSub</span>
                  {health?.checks?.redis?.type && (
                    <span style={{ fontSize: 11, color: '#6E6E7A', marginLeft: 8 }}>
                      {health.checks.redis.type}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#30D158', fontWeight: 600, background: 'rgba(48,209,88,0.12)', padding: '3px 8px', borderRadius: 6 }}>
                {t('superAdmin.overviewPage.opStatusConnected')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#1C1C21', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={16} color="#30D158" />
                <span style={{ fontSize: 13, color: '#FFF', fontWeight: 500 }}>Role-Based Access Control (RBAC)</span>
              </div>
              <span style={{ fontSize: 12, color: '#30D158', fontWeight: 600, background: 'rgba(48,209,88,0.12)', padding: '3px 8px', borderRadius: 6 }}>
                {t('superAdmin.overviewPage.opStatusEnforced')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#1C1C21', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={16} color="#0A84FF" />
                <span style={{ fontSize: 13, color: '#FFF', fontWeight: 500 }}>GPS Telematics Ingestion Engine</span>
              </div>
              <span style={{ fontSize: 12, color: '#0A84FF', fontWeight: 600, background: 'rgba(10,132,255,0.12)', padding: '3px 8px', borderRadius: 6 }}>
                {t('superAdmin.overviewPage.opStatusListening')}
              </span>
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
                {t('superAdmin.overviewPage.emergencyTitle')}
              </h3>
            </div>
            <span style={{
              fontSize: 12, fontWeight: 700,
              padding: '2px 8px', borderRadius: 6,
              background: emergencies.length > 0 ? 'rgba(255,69,58,0.16)' : '#1C1C21',
              color: emergencies.length > 0 ? '#FF453A' : '#6E6E7A'
            }}>
              {t('superAdmin.overviewPage.activeCount', { count: emergencies.length })}
            </span>
          </div>

          {emergencies.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '36px 12px', textAlign: 'center'
            }}>
              <CheckCircle size={36} color="#30D158" style={{ marginBottom: 10 }} />
              <span style={{ color: '#FFF', fontSize: 14, fontWeight: 600 }}>{t('superAdmin.overviewPage.allClearTitle')}</span>
              <span style={{ color: '#6E6E7A', fontSize: 12, marginTop: 4 }}>{t('superAdmin.overviewPage.allClearSub')}</span>
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
                      {t('superAdmin.overviewPage.sosSignal', { name: em.driver?.name || 'Driver' })}
                    </div>
                    <div style={{ color: '#A6A6B2', fontSize: 11, marginTop: 2 }}>
                      {new Date(em.timestamp).toLocaleTimeString()} • {t('superAdmin.overviewPage.phone', { phone: em.driver?.phone || 'N/A' })}
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
                    {t('superAdmin.overviewPage.resolveBtn')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Security & Audit Activity Feed */}
      <div style={{
        background: '#141417',
        border: '1px solid #26262C',
        borderRadius: 14,
        padding: 22
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} color="#FFD60A" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: 0 }}>
              {t('superAdmin.overviewPage.activityTitle')}
            </h3>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('AUDIT_LOG')}
              style={{
                background: 'transparent', border: 'none',
                color: '#FFD60A', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              {t('superAdmin.overviewPage.viewFullAudit')} <ArrowRight size={13} />
            </button>
          )}
        </div>

        {recentLogs.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#6E6E7A', fontSize: 13 }}>
            {t('superAdmin.overviewPage.noLogs')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentLogs.map(log => {
              const badge = getActionBadgeColor(log.action)
              return (
                <div
                  key={log.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: '#1C1C21', borderRadius: 8,
                    flexWrap: 'wrap', gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: badge.bg, color: badge.text, letterSpacing: '0.03em'
                    }}>
                      {log.action}
                    </span>
                    <span style={{ fontSize: 13, color: '#FFF', fontWeight: 500 }}>
                      {log.target ? `${log.target}` : t('superAdmin.overviewPage.system')}
                    </span>
                    <span style={{ fontSize: 12, color: '#A6A6B2' }}>
                      {t('superAdmin.overviewPage.by', { name: log.user?.name || log.user?.email || t('superAdmin.overviewPage.adminDefault') })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6E6E7A', fontSize: 11 }}>
                    <Clock size={12} />
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
