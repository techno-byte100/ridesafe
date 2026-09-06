import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/auth'
import { getWialonAdapter } from '@/lib/core/wialon'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = process.env.WIALON_TOKEN
    if (!token) {
      return NextResponse.json({
        connected: false,
        error: 'WIALON_TOKEN environment variable not configured',
      })
    }

    const adapter = getWialonAdapter()

    // Re-use the existing session if we already have one — do NOT create a new
    // session on every status check (each authenticate() call wastes a Wialon
    // session slot and resets the 5-minute keep-alive timer).
    if (!adapter.isAuthenticated()) {
      const ok = await adapter.authenticate()
      if (!ok) {
        return NextResponse.json({
          connected: false,
          error: 'Failed to authenticate with Wialon API',
        })
      }
    }

    return NextResponse.json({
      connected: true,
      message: 'Connected to Wialon GPS Gateway',
    })
  } catch (error: any) {
    console.error('[Wialon] status check error:', error)
    return NextResponse.json({
      connected: false,
      error: error.message || 'Internal server error',
    })
  }
}
