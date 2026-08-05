'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShieldCheck, Loader2 } from 'lucide-react'

const HC = {
  bg: '#08080A', bgSoft: '#0E0E11', surface: '#141417', line: '#26262C',
  text: '#FFFFFF', text2: '#A6A6B2', text3: '#6E6E7A',
  yellow: '#FFD60A', onYellow: '#08080A', danger: '#FF453A',
  r: '14px', pill: '9999px',
}

interface Summary { studentName: string; parentName: string; amount: number; status: string }

export default function MockPayPage({ params }: { params: Promise<{ billId: string }> }) {
  const { billId } = use(params)
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/public/billplz/mock-pay/${billId}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setSummary(d); else setError(d.error) })
      .finally(() => setLoading(false))
  }, [billId])

  const act = async (outcome: 'paid' | 'failed') => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/public/billplz/mock-pay/${billId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/student-form?regId=${data.regId}`)
      } else {
        setError(data.error || 'Simulation failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: HC.bg, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 20, color: HC.text3, fontSize: 12.5 }}>
          <ShieldCheck size={15} /> Simulated Billplz Checkout (test mode — no real payment provider configured)
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: HC.bgSoft, border: `1px solid ${HC.line}`, borderRadius: HC.r, padding: '28px 26px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: HC.text3, padding: '20px 0' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
          ) : error && !summary ? (
            <div style={{ color: HC.danger, fontSize: 14 }}>{error}</div>
          ) : summary ? (
            <>
              <h2 style={{ color: HC.text, fontSize: 19, fontWeight: 700, margin: '0 0 4px' }}>RideSafe Registration Fee</h2>
              <p style={{ color: HC.text2, fontSize: 13.5, marginBottom: 20 }}>Payer: {summary.parentName} · Student: {summary.studentName}</p>
              <div style={{ background: HC.surface, border: `1px solid ${HC.line}`, borderRadius: HC.r, padding: '18px 20px', marginBottom: 22, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: HC.text3, textTransform: 'uppercase', letterSpacing: '.08em' }}>Amount Due</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: HC.yellow, marginTop: 4 }}>RM {summary.amount.toFixed(2)}</div>
              </div>

              {error && <div style={{ color: HC.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}

              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} disabled={processing}
                onClick={() => act('paid')}
                style={{ width: '100%', padding: '14px', borderRadius: HC.pill, background: HC.yellow, color: HC.onYellow, fontWeight: 700, fontSize: 14.5, border: 'none', cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1, marginBottom: 10 }}>
                {processing ? 'Processing…' : 'Simulate Successful Payment'}
              </motion.button>
              <button disabled={processing} onClick={() => act('failed')}
                style={{ width: '100%', padding: '12px', borderRadius: HC.pill, background: 'none', color: HC.text3, border: `1px solid ${HC.line}`, cursor: processing ? 'not-allowed' : 'pointer', fontSize: 13.5, fontFamily: 'inherit' }}>
                Simulate Failed Payment
              </button>
            </>
          ) : null}
        </motion.div>
      </div>
    </div>
  )
}
