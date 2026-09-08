'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, Mail, MessageSquare, PhoneCall, ShieldAlert, CheckCircle, 
  AlertCircle, Key, RefreshCw, Radio, Download, Sliders, Save, Database
} from 'lucide-react'
import { useTranslation } from '@/i18n/provider'

export default function SuperAdminSystemSettingsTab() {
  const { t } = useTranslation()
  const [testEmail, setTestEmail] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [loadingComms, setLoadingComms] = useState(false)
  
  // Platform configuration states
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [speedLimit, setSpeedLimit] = useState('60')
  const [geofenceRadius, setGeofenceRadius] = useState('500')
  const [autoProvisioning, setAutoProvisioning] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [flushingCache, setFlushingCache] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  // Load current settings from backend
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data.maintenanceMode !== undefined) setMaintenanceMode(data.maintenanceMode)
        if (data.speedLimitKmh) setSpeedLimit(String(data.speedLimitKmh))
        if (data.geofenceRadius) setGeofenceRadius(String(data.geofenceRadius))
        if (data.autoProvisioning !== undefined) setAutoProvisioning(data.autoProvisioning)
      })
      .catch(() => {
        // Fallback to defaults
      })
  }, [])

  const handleTestComms = async (type: 'email' | 'whatsapp' | 'sms') => {
    if (type === 'email' && !testEmail) {
      showToast(t('superAdmin.settingsPage.toastEnterEmail'), 'error')
      return
    }
    if ((type === 'whatsapp' || type === 'sms') && !testPhone) {
      showToast(t('superAdmin.settingsPage.toastEnterPhone'), 'error')
      return
    }

    setLoadingComms(true)
    try {
      const res = await fetch('/api/settings/test-comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: type,
          recipient: type === 'email' ? testEmail : testPhone
        })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(t('superAdmin.settingsPage.toastCommsDispatched', { type: type.toUpperCase() }))
      } else {
        showToast(data.error || t('superAdmin.settingsPage.toastCommsFailed', { type }), 'error')
      }
    } catch {
      showToast(t('superAdmin.settingsPage.toastCommsNetworkError'), 'error')
    } finally {
      setLoadingComms(false)
    }
  }

  const handleToggleMaintenance = async () => {
    const nextState = !maintenanceMode
    setMaintenanceMode(nextState)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceMode: nextState })
      })
      if (res.ok) {
        showToast(nextState ? t('superAdmin.settingsPage.toastMaintenanceActivated') : t('superAdmin.settingsPage.toastMaintenanceDeactivated'), 'success')
      } else {
        setMaintenanceMode(!nextState)
        showToast(t('superAdmin.settingsPage.toastMaintenanceFailed'), 'error')
      }
    } catch {
      setMaintenanceMode(!nextState)
      showToast(t('superAdmin.settingsPage.toastMaintenanceNetworkError'), 'error')
    }
  }

  const handleSavePlatformConfig = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speedLimitKmh: speedLimit,
          geofenceRadius,
          autoProvisioning,
        })
      })
      if (res.ok) {
        showToast(t('superAdmin.settingsPage.toastConfigSaved'))
      } else {
        showToast(t('superAdmin.settingsPage.toastConfigFailed'), 'error')
      }
    } catch {
      showToast(t('superAdmin.settingsPage.toastConfigNetworkError'), 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleFlushCache = async () => {
    setFlushingCache(true)
    try {
      const res = await fetch('/api/admin/settings/flush-cache', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message || t('superAdmin.settingsPage.toastCacheFlushed'))
      } else {
        showToast(data.error || t('superAdmin.settingsPage.toastCacheFailed'), 'error')
      }
    } catch {
      showToast(t('superAdmin.settingsPage.toastCacheNetworkError'), 'error')
    } finally {
      setFlushingCache(false)
    }
  }

  const handleExportCSV = async (type: 'users' | 'organizations' | 'audit-logs') => {
    setExporting(type)
    try {
      const res = await fetch(`/api/admin/export?type=${type}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ridesafe_${type}_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      showToast(t('superAdmin.settingsPage.toastExportedCsv', { type }))
    } catch {
      showToast(t('superAdmin.settingsPage.toastExportFailed', { type }), 'error')
    } finally {
      setExporting(null)
    }
  }

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
            {toastType === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Communications Gateway Test Suite */}
      <div style={{
        background: '#141417',
        border: '1px solid #26262C',
        borderRadius: 14,
        padding: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Radio size={20} color="#FFD60A" />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFF', margin: 0 }}>
            {t('superAdmin.settingsPage.commsSuiteTitle')}
          </h3>
        </div>
        <p style={{ color: '#A6A6B2', fontSize: 13, marginBottom: 20 }}>
          {t('superAdmin.settingsPage.commsSuiteSub')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {/* Email Test */}
          <div style={{ background: '#1C1C21', padding: 18, borderRadius: 12, border: '1px solid #26262C' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Mail size={16} color="#0A84FF" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#FFF' }}>{t('superAdmin.settingsPage.testEmailTitle')}</span>
            </div>
            <input
              type="email"
              placeholder={t('superAdmin.settingsPage.emailPlaceholder')}
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: '#0E0E11', border: '1px solid #26262C',
                color: '#FFF', fontSize: 13, marginBottom: 12, outline: 'none'
              }}
            />
            <button
              onClick={() => handleTestComms('email')}
              disabled={loadingComms}
              style={{
                width: '100%', padding: '10px', borderRadius: 8,
                background: '#0A84FF', color: '#FFF', border: 'none',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                opacity: loadingComms ? 0.7 : 1
              }}
            >
              {t('superAdmin.settingsPage.sendEmailBtn')}
            </button>
          </div>

          {/* SMS / WhatsApp Test */}
          <div style={{ background: '#1C1C21', padding: 18, borderRadius: 12, border: '1px solid #26262C' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MessageSquare size={16} color="#30D158" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#FFF' }}>{t('superAdmin.settingsPage.testPhoneTitle')}</span>
            </div>
            <input
              type="tel"
              placeholder={t('superAdmin.settingsPage.phonePlaceholder')}
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: '#0E0E11', border: '1px solid #26262C',
                color: '#FFF', fontSize: 13, marginBottom: 12, outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleTestComms('whatsapp')}
                disabled={loadingComms}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  background: '#30D158', color: '#000', border: 'none',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  opacity: loadingComms ? 0.7 : 1
                }}
              >
                {t('superAdmin.settingsPage.testWhatsappBtn')}
              </button>
              <button
                onClick={() => handleTestComms('sms')}
                disabled={loadingComms}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  background: '#141417', color: '#FFF', border: '1px solid #3A3A43',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  opacity: loadingComms ? 0.7 : 1
                }}
              >
                {t('superAdmin.settingsPage.testSmsBtn')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Configuration (Global defaults) */}
      <div style={{
        background: '#141417',
        border: '1px solid #26262C',
        borderRadius: 14,
        padding: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Sliders size={20} color="#FFD60A" />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFF', margin: 0 }}>
            {t('superAdmin.settingsPage.policyTitle')}
          </h3>
        </div>
        <p style={{ color: '#A6A6B2', fontSize: 13, marginBottom: 20 }}>
          {t('superAdmin.settingsPage.policySub')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
          <div style={{ background: '#1C1C21', padding: 18, borderRadius: 12, border: '1px solid #26262C' }}>
            <label style={{ display: 'block', color: '#FFF', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              {t('superAdmin.settingsPage.speedLimitLabel')}
            </label>
            <p style={{ color: '#6E6E7A', fontSize: 12, marginBottom: 12 }}>
              {t('superAdmin.settingsPage.speedLimitSub')}
            </p>
            <input
              type="number"
              value={speedLimit}
              onChange={e => setSpeedLimit(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: '#0E0E11', border: '1px solid #26262C',
                color: '#FFF', fontSize: 14, outline: 'none'
              }}
            />
          </div>

          <div style={{ background: '#1C1C21', padding: 18, borderRadius: 12, border: '1px solid #26262C' }}>
            <label style={{ display: 'block', color: '#FFF', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              {t('superAdmin.settingsPage.geofenceLabel')}
            </label>
            <p style={{ color: '#6E6E7A', fontSize: 12, marginBottom: 12 }}>
              {t('superAdmin.settingsPage.geofenceSub')}
            </p>
            <input
              type="number"
              value={geofenceRadius}
              onChange={e => setGeofenceRadius(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: '#0E0E11', border: '1px solid #26262C',
                color: '#FFF', fontSize: 14, outline: 'none'
              }}
            />
          </div>

          <div style={{ background: '#1C1C21', padding: 18, borderRadius: 12, border: '1px solid #26262C' }}>
            <label style={{ display: 'block', color: '#FFF', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              {t('superAdmin.settingsPage.autoProvLabel')}
            </label>
            <p style={{ color: '#6E6E7A', fontSize: 12, marginBottom: 12 }}>
              {t('superAdmin.settingsPage.autoProvSub')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setAutoProvisioning(!autoProvisioning)}
                style={{
                  background: autoProvisioning ? '#30D158' : '#26262C',
                  color: autoProvisioning ? '#000' : '#A6A6B2',
                  border: 'none', padding: '8px 16px', borderRadius: 8,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer'
                }}
              >
                {autoProvisioning ? t('superAdmin.settingsPage.statusEnabled') : t('superAdmin.settingsPage.statusDisabled')}
              </button>
              <span style={{ fontSize: 13, color: '#A6A6B2' }}>
                {autoProvisioning ? t('superAdmin.settingsPage.autoProvActive') : t('superAdmin.settingsPage.autoProvManual')}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSavePlatformConfig}
            disabled={savingSettings}
            style={{
              background: '#FFD60A', color: '#08080A',
              border: 'none', padding: '10px 24px', borderRadius: 8,
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: savingSettings ? 0.7 : 1
            }}
          >
            <Save size={16} />
            {savingSettings ? t('superAdmin.settingsPage.saving') : t('superAdmin.settingsPage.savePolicyBtn')}
          </button>
        </div>
      </div>

      {/* Developer & Platform Security Controls */}
      <div style={{
        background: '#141417',
        border: '1px solid #26262C',
        borderRadius: 14,
        padding: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <ShieldAlert size={20} color="#FF453A" />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFF', margin: 0 }}>
            {t('superAdmin.settingsPage.maintenanceTitle')}
          </h3>
        </div>
        <p style={{ color: '#A6A6B2', fontSize: 13, marginBottom: 20 }}>
          {t('superAdmin.settingsPage.maintenanceSub')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', background: '#1C1C21', borderRadius: 10, flexWrap: 'wrap', gap: 12
          }}>
            <div>
              <div style={{ color: '#FFF', fontWeight: 600, fontSize: 14 }}>{t('superAdmin.settingsPage.maintenanceLockTitle')}</div>
              <div style={{ color: '#6E6E7A', fontSize: 12, marginTop: 2 }}>
                {t('superAdmin.settingsPage.maintenanceLockSub')}
              </div>
            </div>
            <button
              onClick={handleToggleMaintenance}
              style={{
                background: maintenanceMode ? '#FF453A' : '#26262C',
                color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: 8,
                fontWeight: 600, fontSize: 13, cursor: 'pointer'
              }}
            >
              {maintenanceMode ? t('superAdmin.settingsPage.maintenanceActive') : t('superAdmin.settingsPage.maintenanceDisabled')}
            </button>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', background: '#1C1C21', borderRadius: 10, flexWrap: 'wrap', gap: 12
          }}>
            <div>
              <div style={{ color: '#FFF', fontWeight: 600, fontSize: 14 }}>{t('superAdmin.settingsPage.clearCacheTitle')}</div>
              <div style={{ color: '#6E6E7A', fontSize: 12, marginTop: 2 }}>
                {t('superAdmin.settingsPage.clearCacheSub')}
              </div>
            </div>
            <button
              onClick={handleFlushCache}
              disabled={flushingCache}
              style={{
                background: '#FFD60A', color: '#08080A',
                border: 'none', padding: '8px 16px', borderRadius: 8,
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: flushingCache ? 0.7 : 1
              }}
            >
              <RefreshCw size={14} className={flushingCache ? 'animate-spin' : ''} />
              {flushingCache ? t('superAdmin.settingsPage.flushing') : t('superAdmin.settingsPage.flushCacheBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* Cross-Tenant Data Export Suite */}
      <div style={{
        background: '#141417',
        border: '1px solid #26262C',
        borderRadius: 14,
        padding: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Database size={20} color="#0A84FF" />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFF', margin: 0 }}>
            {t('superAdmin.settingsPage.exportSuiteTitle')}
          </h3>
        </div>
        <p style={{ color: '#A6A6B2', fontSize: 13, marginBottom: 20 }}>
          {t('superAdmin.settingsPage.exportSuiteSub')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div style={{ background: '#1C1C21', padding: 18, borderRadius: 12, border: '1px solid #26262C' }}>
            <h4 style={{ color: '#FFF', margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>{t('superAdmin.settingsPage.exportUsersTitle')}</h4>
            <p style={{ color: '#6E6E7A', fontSize: 12, marginBottom: 14 }}>{t('superAdmin.settingsPage.exportUsersSub')}</p>
            <button
              onClick={() => handleExportCSV('users')}
              disabled={exporting !== null}
              style={{
                width: '100%', padding: '9px', borderRadius: 8,
                background: '#141417', border: '1px solid #3A3A43',
                color: '#FFF', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: 'pointer'
              }}
            >
              <Download size={14} color="#0A84FF" />
              {exporting === 'users' ? t('superAdmin.settingsPage.exporting') : t('superAdmin.settingsPage.exportUsersBtn')}
            </button>
          </div>

          <div style={{ background: '#1C1C21', padding: 18, borderRadius: 12, border: '1px solid #26262C' }}>
            <h4 style={{ color: '#FFF', margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>{t('superAdmin.settingsPage.exportTenantsTitle')}</h4>
            <p style={{ color: '#6E6E7A', fontSize: 12, marginBottom: 14 }}>{t('superAdmin.settingsPage.exportTenantsSub')}</p>
            <button
              onClick={() => handleExportCSV('organizations')}
              disabled={exporting !== null}
              style={{
                width: '100%', padding: '9px', borderRadius: 8,
                background: '#141417', border: '1px solid #3A3A43',
                color: '#FFF', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: 'pointer'
              }}
            >
              <Download size={14} color="#30D158" />
              {exporting === 'organizations' ? t('superAdmin.settingsPage.exporting') : t('superAdmin.settingsPage.exportTenantsBtn')}
            </button>
          </div>

          <div style={{ background: '#1C1C21', padding: 18, borderRadius: 12, border: '1px solid #26262C' }}>
            <h4 style={{ color: '#FFF', margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>{t('superAdmin.settingsPage.exportAuditTitle')}</h4>
            <p style={{ color: '#6E6E7A', fontSize: 12, marginBottom: 14 }}>{t('superAdmin.settingsPage.exportAuditSub')}</p>
            <button
              onClick={() => handleExportCSV('audit-logs')}
              disabled={exporting !== null}
              style={{
                width: '100%', padding: '9px', borderRadius: 8,
                background: '#141417', border: '1px solid #3A3A43',
                color: '#FFF', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: 'pointer'
              }}
            >
              <Download size={14} color="#FFD60A" />
              {exporting === 'audit-logs' ? t('superAdmin.settingsPage.exporting') : t('superAdmin.settingsPage.exportAuditBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
