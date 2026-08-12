'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowLeft, XCircle, Loader2 } from 'lucide-react'

const HC = {
  bg:         '#08080A',
  bgSoft:     '#0E0E11',
  surface:    '#141417',
  line:       '#26262C',
  lineStrong: '#3A3A43',
  text:       '#FFFFFF',
  text2:      '#A6A6B2',
  text3:      '#6E6E7A',
  yellow:     '#FFD60A',
  onYellow:   '#08080A',
  danger:     '#FF453A',
  dangerBg:   'rgba(255,69,58,0.12)',
  success:    '#2FD16B',
  r:          '14px',
  pill:       '9999px',
}

const SELF_PICKUP_OPTIONS = [
  { value: '',              label: 'Bus Transport (no self-pickup)' },
  { value: 'MORNING',       label: 'Morning Self-Pickup' },
  { value: 'PM',            label: 'PM Self-Pickup' },
  { value: 'AFTER_SCHOOL',  label: 'After School Activity' },
]

const todayStr = new Date().toISOString().split('T')[0]

const defaultForm = {
  parentName: '', parentEmail: '',
  name: '', grade: '', level: 'Primary', dob: '', preferredStartDate: '',
  parentContact1: '', parentContact2: '', selfPickupSession: '',
}

function fieldStyle(hasError: boolean) {
  return {
    width: '100%', padding: '12px 14px', marginBottom: 4,
    background: HC.surface, border: `1px solid ${hasError ? HC.danger : HC.line}`,
    borderRadius: HC.r, color: HC.text, fontSize: 14.5, fontFamily: 'inherit', outline: 'none',
  } as React.CSSProperties
}

function labelStyle() {
  return { fontSize: 11.5, fontWeight: 700, letterSpacing: '.1em', color: HC.text3, display: 'block', marginBottom: 8, textTransform: 'uppercase' as const }
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: HC.bgSoft, border: `1px solid ${HC.line}`, borderRadius: HC.r, padding: '40px 28px', textAlign: 'center' }}
    >
      {children}
    </motion.div>
  )
}

function PaymentConfirmation({ regId }: { regId: string }) {
  const [status, setStatus] = useState<'confirming' | 'paid' | 'failed' | 'timeout'>('confirming')
  const [result, setResult] = useState<{ tempPassword?: string; parentEmail?: string; studentName?: string }>({})

  useEffect(() => {
    let tries = 0
    let cancelled = false
    const poll = async () => {
      if (cancelled) return
      tries += 1
      try {
        const res = await fetch(`/api/public/register/status?regId=${regId}`)
        const data = await res.json()
        if (data.status === 'PAID') {
          setResult({ tempPassword: data.tempPassword, parentEmail: data.parentEmail, studentName: data.studentName })
          setStatus('paid')
          return
        }
        if (data.status === 'FAILED') { setStatus('failed'); return }
      } catch { /* keep polling */ }
      if (tries >= 40) { setStatus('timeout'); return }
      setTimeout(poll, 1500)
    }
    poll()
    return () => { cancelled = true }
  }, [regId])

  if (status === 'confirming') {
    return (
      <ResultCard>
        <Loader2 size={36} color={HC.yellow} style={{ marginBottom: 16, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <h2 style={{ color: HC.text, fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Confirming your payment…</h2>
        <p style={{ color: HC.text2, fontSize: 14, lineHeight: 1.6 }}>This usually only takes a few seconds. Please don&apos;t close this page.</p>
      </ResultCard>
    )
  }

  if (status === 'paid') {
    return (
      <ResultCard>
        <CheckCircle size={40} color={HC.success} style={{ marginBottom: 16 }} />
        <h2 style={{ color: HC.text, fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Payment confirmed!</h2>
        <p style={{ color: HC.text2, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
          {result.studentName ? <>{result.studentName}&apos;s registration is complete.</> : 'Registration complete.'} A parent account has been created for you.
        </p>
        {result.tempPassword && (
          <div style={{ background: HC.surface, border: `1px solid ${HC.line}`, borderRadius: HC.r, padding: '16px 18px', textAlign: 'left', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: HC.text3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Login Email</div>
            <div style={{ color: HC.text, fontSize: 14, marginBottom: 12, wordBreak: 'break-all' }}>{result.parentEmail}</div>
            <div style={{ fontSize: 11, color: HC.text3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Temporary Password</div>
            <div style={{ color: HC.yellow, fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{result.tempPassword}</div>
            <div style={{ color: HC.text3, fontSize: 12, marginTop: 10 }}>Save this now — it won&apos;t be shown again. You can change it after logging in.</div>
          </div>
        )}
        <Link href="/" style={{ display: 'inline-block', marginTop: 12, color: HC.onYellow, background: HC.yellow, padding: '10px 22px', borderRadius: HC.pill, fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>
          Go to login
        </Link>
      </ResultCard>
    )
  }

  if (status === 'failed') {
    return (
      <ResultCard>
        <XCircle size={40} color={HC.danger} style={{ marginBottom: 16 }} />
        <h2 style={{ color: HC.text, fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Payment not completed</h2>
        <p style={{ color: HC.text2, fontSize: 14, lineHeight: 1.6 }}>Your registration wasn&apos;t completed. No account was created. You can try registering again.</p>
        <Link href="/student-form" style={{ display: 'inline-block', marginTop: 16, color: HC.text2, border: `1px solid ${HC.lineStrong}`, padding: '10px 20px', borderRadius: HC.pill, fontSize: 13.5, textDecoration: 'none' }}>
          Try again
        </Link>
      </ResultCard>
    )
  }

  return (
    <ResultCard>
      <h2 style={{ color: HC.text, fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Still processing</h2>
      <p style={{ color: HC.text2, fontSize: 14, lineHeight: 1.6 }}>
        We&apos;re still waiting for payment confirmation. If you completed payment, check your email shortly — otherwise contact the transport office.
      </p>
    </ResultCard>
  )
}

function RegistrationForm() {
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const set = (k: keyof typeof defaultForm, v: string) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.parentName.trim() || form.parentName.trim().length < 2) errs.parentName = 'Enter the parent/guardian\'s full name'
    if (!form.parentEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail.trim())) errs.parentEmail = 'Enter a valid email address'
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Enter the student\'s full name'
    if (!form.grade.trim()) errs.grade = 'Grade is required'
    if (!form.parentContact1.trim() || !/^[+0-9\s()-]{7,20}$/.test(form.parentContact1.trim())) errs.parentContact1 = 'Enter a valid phone number'
    if (form.parentContact2 && !/^[+0-9\s()-]{7,20}$/.test(form.parentContact2.trim())) errs.parentContact2 = 'Enter a valid phone number'
    if (form.dob && form.dob > todayStr) errs.dob = 'Date of birth cannot be in the future'
    if (form.preferredStartDate && form.preferredStartDate < todayStr) errs.preferredStartDate = 'Preferred start date cannot be in the past'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/public/student-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        setServerError(data.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
      }
    } catch {
      setServerError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: HC.bgSoft, border: `1px solid ${HC.line}`, borderRadius: HC.r, padding: '32px 28px' }}>
      <h2 style={{ color: HC.text, fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        Student Registration
      </h2>
      <p style={{ color: HC.text2, fontSize: 14, marginBottom: 24 }}>
        Fill in your details below to register for school transport. A one-time registration fee applies, payable securely via Billplz.
      </p>

      {serverError && (
        <div style={{ background: HC.dangerBg, color: HC.danger, border: `1px solid rgba(255,69,58,0.25)`, borderRadius: HC.r, padding: '12px 16px', marginBottom: 18, fontSize: 13.5 }}>
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label style={labelStyle()}>Your Full Name (Parent/Guardian) *</label>
        <input style={fieldStyle(!!errors.parentName)} value={form.parentName} onChange={e => set('parentName', e.target.value)} placeholder="e.g. Zulkifli bin Hassan" />
        {errors.parentName && <div style={{ color: HC.danger, fontSize: 12, marginBottom: 12 }}>{errors.parentName}</div>}
        <div style={{ marginBottom: 14 }} />

        <label style={labelStyle()}>Your Email *</label>
        <input type="email" style={fieldStyle(!!errors.parentEmail)} value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)} placeholder="you@example.com" />
        {errors.parentEmail && <div style={{ color: HC.danger, fontSize: 12, marginBottom: 12 }}>{errors.parentEmail}</div>}
        <div style={{ color: HC.text3, fontSize: 12, marginTop: -2, marginBottom: 14 }}>Your parent account login will be created at this email after payment.</div>

        <label style={labelStyle()}>Student Full Name *</label>
        <input style={fieldStyle(!!errors.name)} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Aiman bin Zulkifli" />
        {errors.name && <div style={{ color: HC.danger, fontSize: 12, marginBottom: 12 }}>{errors.name}</div>}
        <div style={{ marginBottom: 14 }} />

        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle()}>Grade / Class *</label>
            <input style={fieldStyle(!!errors.grade)} value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="e.g. Year 4" />
            {errors.grade && <div style={{ color: HC.danger, fontSize: 12 }}>{errors.grade}</div>}
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle()}>Level</label>
            <select className="select-field" style={fieldStyle(false)} value={form.level} onChange={e => set('level', e.target.value)}>
              <option value="Primary">Primary</option>
              <option value="Secondary">Secondary</option>
            </select>
          </div>
        </div>

        <label style={labelStyle()}>Date of Birth</label>
        <input type="date" style={fieldStyle(!!errors.dob)} value={form.dob} max={todayStr} onChange={e => set('dob', e.target.value)} />
        {errors.dob && <div style={{ color: HC.danger, fontSize: 12, marginBottom: 12 }}>{errors.dob}</div>}
        <div style={{ marginBottom: 14 }} />

        <label style={labelStyle()}>Preferred Start Date</label>
        <input type="date" style={fieldStyle(!!errors.preferredStartDate)} value={form.preferredStartDate} min={todayStr} onChange={e => set('preferredStartDate', e.target.value)} />
        {errors.preferredStartDate && <div style={{ color: HC.danger, fontSize: 12, marginBottom: 12 }}>{errors.preferredStartDate}</div>}
        <div style={{ color: HC.text3, fontSize: 12, marginTop: -2, marginBottom: 14 }}>When would you like transport to begin? Leave blank if unsure.</div>

        <label style={labelStyle()}>Parent/Guardian Contact *</label>
        <input type="tel" style={fieldStyle(!!errors.parentContact1)} value={form.parentContact1} maxLength={20} onChange={e => set('parentContact1', e.target.value.replace(/[^0-9+\s()-]/g, ''))} placeholder="+60 12-345 6789" />
        {errors.parentContact1 && <div style={{ color: HC.danger, fontSize: 12, marginBottom: 12 }}>{errors.parentContact1}</div>}
        <div style={{ marginBottom: 14 }} />

        <label style={labelStyle()}>Secondary Contact (optional)</label>
        <input type="tel" style={fieldStyle(!!errors.parentContact2)} value={form.parentContact2} maxLength={20} onChange={e => set('parentContact2', e.target.value.replace(/[^0-9+\s()-]/g, ''))} placeholder="+60 12-345 6789" />
        {errors.parentContact2 && <div style={{ color: HC.danger, fontSize: 12, marginBottom: 12 }}>{errors.parentContact2}</div>}
        <div style={{ marginBottom: 14 }} />

        <label style={labelStyle()}>Self-Pickup</label>
        <select className="select-field" style={fieldStyle(false)} value={form.selfPickupSession} onChange={e => set('selfPickupSession', e.target.value)}>
          {SELF_PICKUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ marginBottom: 24 }} />

        <motion.button
          whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
          type="submit" disabled={submitting}
          style={{
            width: '100%', padding: '14px', borderRadius: HC.pill,
            background: HC.yellow, color: HC.onYellow, fontWeight: 700, fontSize: 14.5, border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
            fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Redirecting to payment…' : 'Continue to Payment'}
        </motion.button>
      </form>
    </div>
  )
}

function StudentFormBody() {
  const searchParams = useSearchParams()
  const regId = searchParams.get('regId')

  return (
    <div style={{
      minHeight: '100vh', background: HC.bg,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '8px 14px', display: 'inline-flex' }}>
            <Image src="/ridesafe-logo.png" alt="RideSafe" width={175} height={124} style={{ width: 'auto', height: 32 }} priority />
          </div>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: HC.text3, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>

        {regId ? <PaymentConfirmation regId={regId} /> : <RegistrationForm />}
      </div>
    </div>
  )
}

export default function StudentFormPage() {
  return (
    <Suspense fallback={null}>
      <StudentFormBody />
    </Suspense>
  )
}
