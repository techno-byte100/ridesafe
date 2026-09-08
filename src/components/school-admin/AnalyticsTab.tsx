'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Bus, CheckCircle, BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts'
import { useTranslation } from '@/i18n/provider'

const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6']

interface ChartEntry { name: string; value: number; color: string }
interface AnalyticsData {
  statusBreakdown: ChartEntry[]
  tripsBarData: { day: string; trips: number }[]
  trendData: { date: string; pickups: number; dropoffs: number; absent: number }[]
  notifBreakdown: ChartEntry[]
  kpis: { totalStudents: number; totalTrips: number; completedTrips: number; completionRate: number; onTimeRate: number; totalAttendances: number; absentCount: number }
}

export default function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => {
      setData(d); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="bento-grid">
      {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 16 }} />)}
    </div>
  )

  if (!data) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Failed to load analytics.</div>

  const { statusBreakdown, tripsBarData, trendData, notifBreakdown, kpis } = data

  const cardAnim = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.3 } } }
  const containerAnim = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }

  const tooltipStyle = {
    contentStyle: { background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#E2E8F0', fontSize: 13 },
    cursor: { fill: 'rgba(255,255,255,0.03)' },
  }

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="visible">

      {/* KPI Row */}
      <div className="bento-grid" style={{ marginBottom: '2rem' }}>
        {[
          { icon: <GraduationCap size={28}/>, label: t('overview.totalStudents'), val: kpis.totalStudents, color: 'var(--primary)' },
          { icon: <Bus size={28}/>, label: t('analytics.monthly'), val: kpis.totalTrips, color: 'var(--bus-yellow)' },
          { icon: <CheckCircle size={28}/>, label: t('analytics.studentAttendance'), val: `${kpis.completionRate}%`, color: 'var(--success)' },
          { icon: <BarChart3 size={28}/>, label: t('analytics.onTimeRate'), val: `${kpis.onTimeRate}%`, color: '#8B5CF6' },
        ].map(({ icon, label, val, color }) => (
          <motion.div key={label} variants={cardAnim} className="bento-card" style={{ textAlign: 'center', padding: '1.75rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>

        {/* Bar Chart: Trips Per Day */}
        <motion.div variants={cardAnim} className="bento-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Trips by Day of Week</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tripsBarData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="trips" fill="url(#barGradient)" radius={[6,6,0,0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFD54F" />
                  <stop offset="100%" stopColor="#FF8F00" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Area Chart: Attendance Trend */}
        <motion.div variants={cardAnim} className="bento-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Attendance Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={12} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="pickups" stroke="#10B981" fill="rgba(16,185,129,0.15)" strokeWidth={2} name="Pickups" />
              <Area type="monotone" dataKey="dropoffs" stroke="#3B82F6" fill="rgba(59,130,246,0.1)" strokeWidth={2} name="Dropoffs" />
              <Area type="monotone" dataKey="absent" stroke="#EF4444" fill="rgba(239,68,68,0.1)" strokeWidth={2} name="Absent" />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie Chart: Student Status */}
        <motion.div variants={cardAnim} className="bento-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>{t('nav.students')} {t('common.status')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4} strokeWidth={0}>
                {statusBreakdown.map((entry: ChartEntry, i: number) => (
                  <Cell key={i} fill={entry.color || COLORS[i]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie Chart: Notification Types */}
        <motion.div variants={cardAnim} className="bento-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Notification Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={notifBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4} strokeWidth={0}>
                {notifBreakdown.map((entry: ChartEntry, i: number) => (
                  <Cell key={i} fill={entry.color || COLORS[i]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

      </div>
    </motion.div>
  )
}
