import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/auth'
import { getKatsanaAdapter } from '@/lib/adapters/katsana'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adapter = getKatsanaAdapter()

    if (!adapter.isConfigured()) {
      return NextResponse.json({
        connected: false,
        error: 'KATSANA_CLIENT_ID / KATSANA_CLIENT_SECRET not configured',
      })
    }

    // Reuse existing token — only re-auth if expired
    if (!adapter.isAuthenticated()) {
      const ok = await adapter.authenticate()
      if (!ok) {
        return NextResponse.json({
          connected: false,
          error: 'Failed to authenticate with Katsana API',
        })
      }
    }

    return NextResponse.json({
      connected: true,
      message: 'Connected to Katsana Fleet Gateway',
    })
  } catch (error: any) {
    console.error('[Katsana] status check error:', error)
    return NextResponse.json({
      connected: false,
      error: error.message || 'Internal server error',
    })
  }
}
