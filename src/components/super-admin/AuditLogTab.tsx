'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Search, ChevronLeft, ChevronRight, Filter,
  UserPlus, Trash2, Pencil, Building2, Settings, ShieldCheck,
  Clock, AlertCircle
} from 'lucide-react'
import { useTranslation } from '@/i18n/provider'

interface AuditEntry {
  id: string
  userId: string
  action: string
  target?: string
  targetId?: string
  details?: string
  ipAddress?: string
  createdAt: string
  user: { id: string; name: string; email: string; role: string }
}

const ACTION_STYLES: Record<string, { color: string; bg: string; icon: typeof UserPlus }> = {
  CREATE_USER: { color: '#30D158', bg: 'rgba(48,209,88,0.12)', icon: UserPlus },
  CREATE_ORG:  { color: '#30D158', bg: 'rgba(48,209,88,0.12)', icon: Building2 },
  UPDATE_USER: { color: '#0A84FF', bg: 'rgba(10,132,255,0.12)', icon: Pencil },
  UPDATE_ORG:  { color: '#0A84FF', bg: 'rgba(10,132,255,0.12)', icon: Pencil },
  DELETE_USER: { color: '#FF453A', bg: 'rgba(255,69,58,0.12)', icon: Trash2 },
  DELETE_ORG:  { color: '#FF453A', bg: 'rgba(255,69,58,0.12)', icon: Trash2 },
  TOGGLE_MAINTENANCE: { color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)', icon: Settings },
  UPDATE_SETTINGS:    { color: '#BF5AF2', bg: 'rgba(191,90,242,0.12)', icon: Settings },
}

const DEFAULT_STYLE = { color: '#A6A6B2', bg: 'rgba(166,166,178,0.12)', icon: FileText }

export default function AuditLogTab() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const [filterTarget, setFilterTarget] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLogs = async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '30' })
      if (filterAction) params.set('action', filterAction)
      if (filterTarget) params.set('target', filterTarget)

      const res = await fetch(`/api/admin/audit-log?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
        setPage(data.page || 1)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs(1) }, [filterAction, filterTarget])

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) +
           ' ' + date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
  }

  const parseDetails = (d?: string) => {
    if (!d) return null
    try { return JSON.parse(d) } catch { return d }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(191,90,242,0.10) 0%, rgba(20,20,23,0.6) 100%)',
        border: '1px solid rgba(191,90,242,0.25)',
        borderRadius: 16, padding: '22px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{
              background: '#BF5AF2', color: '#FFF',
              fontSize: 11, fontWeight: 800, padding: '3px 8px',
              borderRadius: 6, letterSpacing: '0.05em'
            }}>{t('superAdmin.auditPage.badge')}</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#FFF', margin: 0 }}>
            {t('superAdmin.auditPage.title')}
          </h2>
          <p style={{ color: '#A6A6B2', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            {t('superAdmin.auditPage.subtitle', { count: total })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} color="#A6A6B2" />
          <span style={{ fontSize: 12, color: '#6E6E7A', fontWeight: 600 }}>{t('superAdmin.auditPage.filtersLabel')}</span>
        </div>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          style={{
            background: '#1C1C21', border: '1px solid #26262C',
            borderRadius: 8, padding: '8px 12px', color: '#FFF',
            fontSize: 13, outline: 'none', minWidth: 160
          }}
        >
          <option value="">{t('superAdmin.auditPage.allActions')}</option>
          <option value="CREATE_USER">{t('superAdmin.auditPage.actionsMap.CREATE_USER')}</option>
          <option value="UPDATE_USER">{t('superAdmin.auditPage.actionsMap.UPDATE_USER')}</option>
          <option value="DELETE_USER">{t('superAdmin.auditPage.actionsMap.DELETE_USER')}</option>
          <option value="CREATE_ORG">{t('superAdmin.auditPage.actionsMap.CREATE_ORG')}</option>
          <option value="UPDATE_ORG">{t('superAdmin.auditPage.actionsMap.UPDATE_ORG')}</option>
          <option value="DELETE_ORG">{t('superAdmin.auditPage.actionsMap.DELETE_ORG')}</option>
          <option value="UPDATE_SETTINGS">{t('superAdmin.auditPage.actionsMap.UPDATE_SETTINGS')}</option>
          <option value="TOGGLE_MAINTENANCE">{t('superAdmin.auditPage.actionsMap.TOGGLE_MAINTENANCE')}</option>
        </select>

        <select
          value={filterTarget}
          onChange={e => setFilterTarget(e.target.value)}
          style={{
            background: '#1C1C21', border: '1px solid #26262C',
            borderRadius: 8, padding: '8px 12px', color: '#FFF',
            fontSize: 13, outline: 'none', minWidth: 160
          }}
        >
          <option value="">{t('superAdmin.auditPage.allTargets')}</option>
          <option value="User">{t('superAdmin.auditPage.targetsMap.User')}</option>
          <option value="Organization">{t('superAdmin.auditPage.targetsMap.Organization')}</option>
          <option value="SystemSetting">{t('superAdmin.auditPage.targetsMap.SystemSetting')}</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div style={{
        background: '#141417', border: '1px solid #26262C',
        borderRadius: 14, overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '3px solid #26262C', borderTopColor: '#BF5AF2',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <span style={{ color: '#6E6E7A', fontSize: 13 }}>{t('superAdmin.auditPage.loading')}</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <FileText size={40} color="#26262C" style={{ marginBottom: 12 }} />
            <div style={{ color: '#A6A6B2', fontWeight: 600, fontSize: 15 }}>{t('superAdmin.auditPage.noEntriesTitle')}</div>
            <div style={{ color: '#6E6E7A', fontSize: 13, marginTop: 4 }}>
              {t('superAdmin.auditPage.noEntriesSub')}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 140px 130px 130px 60px',
              padding: '12px 20px', background: '#0E0E11',
              borderBottom: '1px solid #26262C', gap: 10
            }}>
              {[
                t('superAdmin.auditPage.tableHeaders.action'),
                t('superAdmin.auditPage.tableHeaders.performedBy'),
                t('superAdmin.auditPage.tableHeaders.target'),
                t('superAdmin.auditPage.tableHeaders.date'),
                ''
              ].map((h, idx) => (
                <span key={idx} style={{
                  fontSize: 11, fontWeight: 700, color: '#6E6E7A',
                  textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {logs.map(log => {
              const style = ACTION_STYLES[log.action] || DEFAULT_STYLE
              const Icon = style.icon
              const expanded = expandedId === log.id
              const details = parseDetails(log.details)
              const actionName = t(`superAdmin.auditPage.actionsMap.${log.action}`) || log.action.replace(/_/g, ' ')
              const userRoleName = t(`superAdmin.roles.${log.user.role}`) || log.user.role.replace(/_/g, ' ')

              return (
                <div key={log.id}>
                  <motion.div
                    whileHover={{ backgroundColor: '#1C1C21' }}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 140px 130px 130px 60px',
                      padding: '14px 20px', borderBottom: '1px solid #1C1C21',
                      alignItems: 'center', gap: 10, cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                  >
                    {/* Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: style.bg, display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon size={15} color={style.color} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#FFF' }}>
                          {actionName}
                        </div>
                        {log.targetId && (
                          <div style={{ fontSize: 11, color: '#6E6E7A', fontFamily: "'JetBrains Mono', monospace" }}>
                            {log.targetId.slice(0, 16)}…
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Performed By */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#FFF' }}>{log.user.name}</div>
                      <div style={{ fontSize: 11, color: '#6E6E7A' }}>{userRoleName}</div>
                    </div>

                    {/* Target */}
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      padding: '3px 8px', borderRadius: 6,
                      background: style.bg, color: style.color,
                      display: 'inline-block', width: 'fit-content'
                    }}>
                      {log.target ? (t(`superAdmin.auditPage.targetsMap.${log.target}`) || log.target) : '—'}
                    </span>

                    {/* Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} color="#6E6E7A" />
                      <span style={{ fontSize: 12, color: '#A6A6B2' }}>{formatDate(log.createdAt)}</span>
                    </div>

                    {/* Expand indicator */}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 11, color: '#6E6E7A',
                        transform: expanded ? 'rotate(90deg)' : 'none',
                        display: 'inline-block', transition: 'transform 0.2s'
                      }}>▶</span>
                    </div>
                  </motion.div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expanded && details && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          padding: '14px 20px 14px 62px',
                          background: '#0E0E11',
                          borderBottom: '1px solid #1C1C21'
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6E6E7A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {t('superAdmin.auditPage.changeDetails')}
                          </div>
                          <pre style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12, color: '#A6A6B2',
                            background: '#141417', padding: 12,
                            borderRadius: 8, border: '1px solid #26262C',
                            overflow: 'auto', maxHeight: 200,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                          }}>
                            {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12
        }}>
          <button
            disabled={page <= 1}
            onClick={() => fetchLogs(page - 1)}
            style={{
              background: '#1C1C21', border: '1px solid #26262C',
              borderRadius: 8, padding: '8px 12px', color: page <= 1 ? '#3A3A43' : '#FFF',
              cursor: page <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center'
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13, color: '#A6A6B2' }}>
            {t('superAdmin.auditPage.pagination', { page, total: totalPages })}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => fetchLogs(page + 1)}
            style={{
              background: '#1C1C21', border: '1px solid #26262C',
              borderRadius: 8, padding: '8px 12px', color: page >= totalPages ? '#3A3A43' : '#FFF',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
