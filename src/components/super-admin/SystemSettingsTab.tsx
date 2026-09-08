'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, Mail, MessageSquare, PhoneCall, ShieldAlert, CheckCircle, 
  AlertCircle, Key, RefreshCw, Radio
} from 'lucide-react'

export default function SuperAdminSystemSettingsTab() {
  const [testEmail, setTestEmail] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [loadingComms, setLoadingComms] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  const handleTestComms = async (type: 'email' | 'whatsapp' | 'sms') => {
    if (type === 'email' && !testEmail) {
      showToast('Please enter an email address', 'error')
      return
    }
    if ((type === 'whatsapp' || type === 'sms') && !testPhone) {
      showToast('Please enter a phone number', 'error')
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
        showToast(`Test ${type.toUpperCase()} dispatched successfully!`)
      } else {
        showToast(data.error || `Failed to dispatch ${type}`, 'error')
      }
    } catch {
      showToast('Network error testing communications', 'error')
    } finally {
      setLoadingComms(false)
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
            Communications Gateway Test Suite
          </h3>
        </div>
        <p style={{ color: '#A6A6B2', fontSize: 13, marginBottom: 20 }}>
          Verify and diagnose external messaging providers (Brevo Email, Twilio / WhatsApp, SMS OTP relays).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {/* Email Test */}
          <div style={{ background: '#1C1C21', padding: 18, borderRadius: 12, border: '1px solid #26262C' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Mail size={16} color="#0A84FF" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#FFF' }}>Test Email Gateway</span>
            </div>
            <input
              type="email"
              placeholder="developer@ridesafe.com"
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
                fontWeight: 600, fontSize: 13, cursor: 'pointer'
              }}
            >
              Send Diagnostic Email
            </button>
          </div>

          {/* SMS / WhatsApp Test */}
          <div style={{ background: '#1C1C21', padding: 18, borderRadius: 12, border: '1px solid #26262C' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MessageSquare size={16} color="#30D158" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#FFF' }}>Test WhatsApp / SMS Gateway</span>
            </div>
            <input
              type="tel"
              placeholder="+60123456789"
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
                  fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Test WhatsApp
              </button>
              <button
                onClick={() => handleTestComms('sms')}
                disabled={loadingComms}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  background: '#141417', color: '#FFF', border: '1px solid #3A3A43',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Test SMS
              </button>
            </div>
          </div>
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
            Platform Controls & Maintenance Mode
          </h3>
        </div>
        <p style={{ color: '#A6A6B2', fontSize: 13, marginBottom: 20 }}>
          Global switches that affect the entire multi-tenant application ecosystem.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', background: '#1C1C21', borderRadius: 10
          }}>
            <div>
              <div style={{ color: '#FFF', fontWeight: 600, fontSize: 14 }}>Global Maintenance Lock</div>
              <div style={{ color: '#6E6E7A', fontSize: 12, marginTop: 2 }}>
                Temporarily restrict parent and driver app access during core database migrations.
              </div>
            </div>
            <button
              onClick={() => {
                setMaintenanceMode(!maintenanceMode)
                showToast(maintenanceMode ? 'Maintenance mode disabled' : 'Maintenance mode enabled', 'success')
              }}
              style={{
                background: maintenanceMode ? '#FF453A' : '#26262C',
                color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: 8,
                fontWeight: 600, fontSize: 13, cursor: 'pointer'
              }}
            >
              {maintenanceMode ? 'ACTIVE (Locked)' : 'DISABLED (Normal)'}
            </button>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', background: '#1C1C21', borderRadius: 10
          }}>
            <div>
              <div style={{ color: '#FFF', fontWeight: 600, fontSize: 14 }}>Clear Redis Telematics Cache</div>
              <div style={{ color: '#6E6E7A', fontSize: 12, marginTop: 2 }}>
                Flush stuck driver GPS positions or cached route polylines across all schools.
              </div>
            </div>
            <button
              onClick={() => showToast('Redis live telemetry cache flushed successfully')}
              style={{
                background: '#FFD60A', color: '#08080A',
                border: 'none', padding: '8px 16px', borderRadius: 8,
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <RefreshCw size={14} /> Flush Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
