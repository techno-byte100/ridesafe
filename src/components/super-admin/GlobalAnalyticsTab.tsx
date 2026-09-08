"'use client'"
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, Building2, Users, GraduationCap, Bus, Activity,
  DollarSign, UserPlus, AlertTriangle, BarChart3, PieChart
} from 'lucide-react'
import { useTranslation } from '@/i18n/provider'

interface AnalyticsData {
  overview: {
    totalOrgs: number; activeOrgs: number; totalUsers: number
    totalStudents: number; totalBuses: number; totalTrips: number
    activeTrips: number; unresolvedEmergencies: number
  }
  trends: {
    completedTrips30d: number; totalAttendances30d: number
    newUsers7d: number; newStudents7d: number
  }
  revenue: { totalPaid: number; paidInvoices: number }
  roleBreakdown: Record<string, number>
  tripBreakdown: Record<string, number>
  orgBreakdown: { id: string; name: string; subscriptionTier: string; _count: { users: number; students: number; buses: number; routes: number } }[]
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#FFD60A', SCHOOL_ADMIN: '#0A84FF', ADMIN: '#FF9F0A',
  DRIVER: '#30D158', PARENT: '#BF5AF2'
}

const TRIP_STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#30D158', IN_PROGRESS: '#0A84FF', TRIP_CREATED: '#FFD60A',
  CANCELLED: '#FF453A'
}

const TIER_BADGES: Record<string, { color: string; bg: string }> = {
  FREE: { color: '#A6A6B2', bg: 'rgba(166,166,178,0.12)' },
  BASIC: { color: '#0A84FF', bg: 'rgba(10,132,255,0.12)' },
  PREMIUM: { color: '#FFD60A', bg: 'rgba(255,214,10,0.12)' },
}

export default function GlobalAnalyticsTab() {
  const { t } = useTranslation()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: 100, borderRadius: 14, background: '#141417',
            border: '1px solid #26262C', animation: 'pulse 1.5s infinite'
          }} />
        ))}
        <style>{`@keyframes pulse { 0%,100% { opacity: 0.6 } 50% { opacity: 1 } }`}</style>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#6E6E7A' }}>
        <AlertTriangle size={40} style={{ marginBottom: 12 }} />
        <div style={{ fontWeight: 600 }}>{t('superAdmin.analyticsPage.failedToLoad')}</div>
      </div>
    )
  }

  const { overview: ov, trends, revenue, roleBreakdown, tripBreakdown, orgBreakdown } = data

  // Helper for stat cards
  const StatCard = ({ title, value, sub, icon: Icon, color }: {
    title: string; value: string | number; sub: string; icon: typeof TrendingUp; color: string
  }) => (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      style={{
        background: '#141417', border: '1px solid #26262C',
        borderRadius: 14, padding: 20
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ color: '#A6A6B2', fontSize: 13, fontWeight: 500 }}>{title}</span>
        <div style={{ background: `${color}18`, padding: 8, borderRadius: 8, color }}>
          <Icon size={18} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#FFF', marginTop: 10 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6E6E7A', marginTop: 2 }}>{sub}</div>
    </motion.div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(10,132,255,0.10) 0%, rgba(20,20,23,0.6) 100%)',
        border: '1px solid rgba(10,132,255,0.25)',
        borderRadius: 16, padding: '22px 28px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{
            background: '#0A84FF', color: '#FFF',
            fontSize: 11, fontWeight: 800, padding: '3px 8px',
            borderRadius: 6, letterSpacing: '0.05em'
          }}>{t('superAdmin.analyticsPage.badge')}</span>
          <span style={{ color: '#A6A6B2', fontSize: 13 }}>{t('superAdmin.analyticsPage.subBadge')}</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#FFF', margin: 0 }}>
          {t('superAdmin.analyticsPage.title')}
        </h2>
        <p style={{ color: '#A6A6B2', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
          {t('superAdmin.analyticsPage.subtitle')}
        </p>
      </div>

      {/* Top KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard title={t('superAdmin.analyticsPage.totalOrgsTitle')} value={ov.totalOrgs} sub={t('superAdmin.analyticsPage.activeSub', { count: ov.activeOrgs })} icon={Building2} color="#FFD60A" />
        <StatCard title={t('superAdmin.analyticsPage.platformUsersTitle')} value={ov.totalUsers} sub={t('superAdmin.analyticsPage.usersThisWeek', { count: trends.newUsers7d })} icon={Users} color="#30D158" />
        <StatCard title={t('superAdmin.analyticsPage.enrolledStudentsTitle')} value={ov.totalStudents} sub={t('superAdmin.analyticsPage.studentsThisWeek', { count: trends.newStudents7d })} icon={GraduationCap} color="#0A84FF" />
        <StatCard title={t('superAdmin.analyticsPage.totalFleetTitle')} value={ov.totalBuses} sub={t('superAdmin.analyticsPage.tripsInProgress', { count: ov.activeTrips })} icon={Bus} color="#BF5AF2" />
      </div>

      {/* Second Row: Trips & Revenue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard title={t('superAdmin.analyticsPage.trips30DaysTitle')} value={trends.completedTrips30d} sub={t('superAdmin.analyticsPage.allTimeSub', { count: ov.totalTrips })} icon={Activity} color="#FF9F0A" />
        <StatCard title={t('superAdmin.analyticsPage.attendanceTitle')} value={trends.totalAttendances30d} sub={t('superAdmin.analyticsPage.attendanceSub')} icon={TrendingUp} color="#30D158" />
        <StatCard title={t('superAdmin.analyticsPage.revenueTitle')} value={`RM ${revenue.totalPaid.toLocaleString()}`} sub={t('superAdmin.analyticsPage.paidInvoicesSub', { count: revenue.paidInvoices })} icon={DollarSign} color="#FFD60A" />
        <StatCard
          title={t('superAdmin.analyticsPage.emergenciesTitle')}
          value={ov.unresolvedEmergencies}
          sub={ov.unresolvedEmergencies === 0 ? t('superAdmin.analyticsPage.allClear') : t('superAdmin.analyticsPage.needsAttention')}
          icon={AlertTriangle}
          color={ov.unresolvedEmergencies > 0 ? '#FF453A' : '#30D158'}
        />
      </div>

      {/* Role & Trip Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* Role Distribution */}
        <div style={{
          background: '#141417', border: '1px solid #26262C',
          borderRadius: 14, padding: 22
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <PieChart size={18} color="#BF5AF2" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: 0 }}>{t('superAdmin.analyticsPage.userRoleDistTitle')}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(roleBreakdown).map(([role, count]) => {
              const total = Object.values(roleBreakdown).reduce((a, b) => a + b, 0)
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const color = ROLE_COLORS[role] || '#A6A6B2'
              const roleLabel = t(`superAdmin.roles.${role}`) || role.replace(/_/g, ' ')
              return (
                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 90, fontSize: 12, fontWeight: 600, color: '#A6A6B2' }}>
                    {roleLabel}
                  </div>
                  <div style={{ flex: 1, height: 8, background: '#1C1C21', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', background: color,
                      borderRadius: 4, transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <div style={{ width: 50, textAlign: 'right', fontSize: 13, fontWeight: 700, color }}>
                    {count}
                  </div>
                  <div style={{ width: 36, textAlign: 'right', fontSize: 11, color: '#6E6E7A' }}>
                    {pct}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Trip Status Breakdown */}
        <div style={{
          background: '#141417', border: '1px solid #26262C',
          borderRadius: 14, padding: 22
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <BarChart3 size={18} color="#0A84FF" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: 0 }}>{t('superAdmin.analyticsPage.tripStatus30DaysTitle')}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(tripBreakdown).length === 0 ? (
              <div style={{ color: '#6E6E7A', fontSize: 13, textAlign: 'center', padding: 20 }}>
                {t('superAdmin.analyticsPage.noTripData')}
              </div>
            ) : Object.entries(tripBreakdown).map(([status, count]) => {
              const total = Object.values(tripBreakdown).reduce((a, b) => a + b, 0)
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const color = TRIP_STATUS_COLORS[status] || '#A6A6B2'
              return (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 110, fontSize: 12, fontWeight: 600, color: '#A6A6B2' }}>
                    {status.replace(/_/g, ' ')}
                  </div>
                  <div style={{ flex: 1, height: 8, background: '#1C1C21', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', background: color,
                      borderRadius: 4, transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <div style={{ width: 50, textAlign: 'right', fontSize: 13, fontWeight: 700, color }}>
                    {count}
                  </div>
                  <div style={{ width: 36, textAlign: 'right', fontSize: 11, color: '#6E6E7A' }}>
                    {pct}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Organization Comparison Table */}
      <div style={{
        background: '#141417', border: '1px solid #26262C',
        borderRadius: 14, padding: 22
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Building2 size={18} color="#FFD60A" />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFF', margin: 0 }}>
            {t('superAdmin.analyticsPage.orgPerfTitle')}
          </h3>
        </div>

        {orgBreakdown.length === 0 ? (
          <div style={{ color: '#6E6E7A', fontSize: 13, textAlign: 'center', padding: 30 }}>
            {t('superAdmin.analyticsPage.noOrgs')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #26262C' }}>
                  {[
                    t('superAdmin.analyticsPage.tableHeaders.school'),
                    t('superAdmin.analyticsPage.tableHeaders.tier'),
                    t('superAdmin.analyticsPage.tableHeaders.users'),
                    t('superAdmin.analyticsPage.tableHeaders.students'),
                    t('superAdmin.analyticsPage.tableHeaders.buses'),
                    t('superAdmin.analyticsPage.tableHeaders.routes')
                  ].map((h, idx) => (
                    <th key={idx} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: '#6E6E7A',
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgBreakdown.map(org => {
                  const tier = TIER_BADGES[org.subscriptionTier] || TIER_BADGES.FREE
                  return (
                    <tr key={org.id} style={{ borderBottom: '1px solid #1C1C21' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#FFF' }}>{org.name}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 8px',
                          borderRadius: 6, background: tier.bg, color: tier.color
                        }}>{t(`superAdmin.tiers.${org.subscriptionTier}`) || org.subscriptionTier}</span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#A6A6B2' }}>{org._count.users}</td>
                      <td style={{ padding: '12px 14px', color: '#A6A6B2' }}>{org._count.students}</td>
                      <td style={{ padding: '12px 14px', color: '#A6A6B2' }}>{org._count.buses}</td>
                      <td style={{ padding: '12px 14px', color: '#A6A6B2' }}>{org._count.routes}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
