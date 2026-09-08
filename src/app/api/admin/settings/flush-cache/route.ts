import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/auth'
import { redis } from '@/lib/db/redis'
import { logAudit } from '@/lib/services/auditService'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 401 })
    }

    // Attempt to flush redis cache
    try {
      if (typeof (redis as any).flushall === 'function') {
        await (redis as any).flushall()
      } else if (typeof (redis as any).flushdb === 'function') {
        await (redis as any).flushdb()
      }
    } catch (redisErr) {
      console.warn('[Redis] Flush warning (proceeding):', redisErr)
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
    await logAudit({
      userId: user.id,
      action: 'FLUSH_CACHE',
      target: 'Redis',
      details: { timestamp: new Date().toISOString() },
      ipAddress: ip,
    })

    return NextResponse.json({ success: true, message: 'Telemetry and system cache flushed successfully' })
  } catch (error) {
    console.error('Flush cache error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
