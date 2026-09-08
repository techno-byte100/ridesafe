'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'

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
  yellowDeep: '#F5A623',
  yellowGlow: 'rgba(255,214,10,0.30)',
  onYellow:   '#08080A',
  danger:     '#FF453A',
  dangerBg:   'rgba(255,69,58,0.12)',
  r:          '14px',
  pill:       '9999px',
}

import { useTranslation, LanguageSwitcher } from '@/i18n/provider'

export default function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showForgotMsg, setShowForgotMsg] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('auth.invalidCredentials'))
      const role = data.user.role
      if (role === 'SUPER_ADMIN') {
        router.push('/super-admin')
      } else if (role === 'SCHOOL_ADMIN') {
        router.push('/school-admin')
      } else if (role === 'ADMIN') {
        router.push('/admin')
      } else if (role === 'DRIVER') {
        router.push('/driver')
      } else if (role === 'PARENT') {
        router.push('/parent')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <style>{`
      .tb-login { display: flex; flex-direction: row; }
      @media (max-width: 820px) {
        .tb-login { flex-direction: column !important; }
        .tb-login-brand { flex: none !important; min-height: 260px; padding: 28px 24px !important; }
        .tb-login-form { flex: none !important; padding: 32px 24px !important; min-height: auto; }
      }
    `}</style>
    <div className="tb-login" style={{
      minHeight: 'calc(100vh - 70px)',
      margin: '-2rem -2rem -2rem',
      background: HC.bg,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/* ── Left brand panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="tb-login-brand"
        style={{
          flex: '1.05',
          position: 'relative',
          overflow: 'hidden',
          padding: '44px 52px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'radial-gradient(120% 80% at 0% 0%, #16140A 0%, #08080A 55%)',
        }}
      >
        {/* Grid line texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.45,
          backgroundImage: `linear-gradient(${HC.line} 1px, transparent 1px), linear-gradient(90deg, ${HC.line} 1px, transparent 1px)`,
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(80% 70% at 30% 20%, #000 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(80% 70% at 30% 20%, #000 30%, transparent 80%)',
        }} />

        {/* Hero copy */}
        <div style={{ position: 'relative' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: HC.yellow, marginBottom: 18,
          }}>
            Smart Transport Management
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            style={{
              fontFamily: 'var(--font-sora, Sora, system-ui)',
              fontSize: 'clamp(36px, 4vw, 52px)',
              fontWeight: 800,
              lineHeight: 1.05,
              color: HC.text,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Get on board,<br />
            <span style={{ color: HC.yellow }}>safely.</span>
          </motion.h1>
          <p style={{ color: HC.text2, fontSize: 15.5, lineHeight: 1.65, maxWidth: 380, marginTop: 20 }}>
            Real-time tracking, instant check-ins, and total peace of mind for every family on every route.
          </p>
        </div>

        {/* Footer */}
        <div style={{ fontSize: 12, color: HC.text3, position: 'relative' }}>
          © 2026 RideSafe
        </div>
      </motion.div>

      {/* ── Right form panel ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="tb-login-form"
        style={{
          flex: '0.95',
          background: HC.bgSoft,
          borderLeft: `1px solid ${HC.line}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 clamp(28px, 5vw, 64px)',
        }}
      >
        <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: 20 }}>
            <LanguageSwitcher />
          </div>

          <h2 style={{
            fontFamily: 'var(--font-sora, Sora, system-ui)',
            fontSize: 28, fontWeight: 700, color: HC.text, letterSpacing: '-0.03em', margin: 0,
          }}>
            {t('auth.loginTitle')}
          </h2>
          <p style={{ color: HC.text2, marginTop: 8, marginBottom: 30, fontSize: 14.5 }}>
            {t('auth.loginSubtitle')}
          </p>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: HC.dangerBg, color: HC.danger,
                border: `1px solid rgba(255,69,58,0.25)`,
                borderRadius: HC.r, padding: '12px 16px', marginBottom: 20, fontSize: 13.5,
              }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin}>
            {/* Email */}
            <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.1em', color: HC.text3, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
              {t('auth.email')}
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '13px 16px', marginBottom: 18,
              background: HC.surface, border: `1px solid ${HC.line}`,
              borderRadius: HC.r, color: HC.text3,
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder={t('auth.enterEmail')}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: HC.text, fontSize: 14.5, fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Password */}
            <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.1em', color: HC.text3, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
              {t('auth.password')}
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '13px 16px', marginBottom: 14,
              background: HC.surface, border: `1px solid ${HC.lineStrong}`,
              borderRadius: HC.r, color: HC.text3,
              boxShadow: `0 0 0 3px rgba(255,214,10,0.08)`,
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: HC.text, fontSize: 14.5, letterSpacing: showPw ? 0 : 3, fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: HC.text3, padding: 0, display: 'flex' }}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? (
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                ) : (
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Forgot */}
            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <span
                style={{ fontSize: 13, color: HC.yellow, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setShowForgotMsg(v => !v)}
              >
                {t('auth.forgotPassword')}
              </span>
              {showForgotMsg && (
                <div style={{ marginTop: 8, fontSize: 12, color: HC.text2, background: HC.surface2, border: `1px solid ${HC.line}`, borderRadius: HC.r, padding: '10px 14px', textAlign: 'left' }}>
                  {t('auth.forgotNotice')}
                </div>
              )}
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                borderRadius: HC.pill,
                background: HC.yellow, color: HC.onYellow,
                fontWeight: 700, fontSize: 14.5, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: `0 0 0 1px rgba(255,214,10,0.25), 0 10px 40px rgba(255,214,10,0.18)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'inherit',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              }}
            >
              {loading ? t('auth.signingIn') : <>{t('auth.login')} <span style={{ marginLeft: 2 }}>→</span></>}
            </motion.button>
          </form>

          {/* Demo Role pills */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: HC.text3, textTransform: 'uppercase', marginBottom: 10 }}>
              {t('auth.demoAccounts')}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'Super Admin', email: 'admin@ridesafe.com', color: '#FFD60A' },
                { label: 'School Admin', email: 'schooladmin@ridesafe.com', color: '#0A84FF' },
                { label: 'Desk Admin', email: 'deskadmin@ridesafe.com', color: '#FF9F0A' },
                { label: t('auth.driverDemo'), email: 'driver@ridesafe.com', color: '#30D158' },
                { label: t('auth.parentDemo'), email: 'parent1@ridesafe.com', color: '#BF5AF2' },
              ].map((r) => (
                <button
                  key={r.email}
                  type="button"
                  onClick={() => {
                    setEmail(r.email)
                    setPassword('password123')
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', padding: '6px 12px',
                    borderRadius: HC.pill, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em',
                    background: `${r.color}15`,
                    color: r.color,
                    border: `1px solid ${r.color}40`,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = `${r.color}30`
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = `${r.color}15`
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 28, textAlign: 'center', fontSize: 12.5, color: HC.text3 }}>
            Need access?{' '}
            <a href="#" style={{ color: HC.yellow, textDecoration: 'none', fontWeight: 600 }}>
              Contact Administrator
            </a>
          </div>

          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12.5, color: HC.text3 }}>
            New student?{' '}
            <Link href="/student-form" style={{ color: HC.yellow, textDecoration: 'none', fontWeight: 600 }}>
              Register here
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
    </>
  )
}
