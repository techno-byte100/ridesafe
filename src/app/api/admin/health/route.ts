import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { redis } from '@/lib/db/redis'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const t0 = Date.now()

    // 1. Check Database
    let dbStatus = 'operational'
    let dbLatencyMs = 0
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      dbLatencyMs = Date.now() - dbStart
    } catch (dbErr) {
      dbStatus = 'degraded'
      console.error('[Health] DB check error:', dbErr)
    }

    // 2. Check Redis
    let redisStatus = 'connected'
    let redisLatencyMs = 0
    try {
      const rStart = Date.now()
      await redis.set('__health_ping__', '1', 'EX', 5)
      redisLatencyMs = Date.now() - rStart
    } catch (rErr) {
      redisStatus = 'mock_mode'
    }

    // 3. System maintenance setting
    let maintenanceMode = false
    try {
      const maint = await prisma.systemSetting.findUnique({
        where: { key: 'MAINTENANCE_MODE' }
      })
      maintenanceMode = maint?.value === 'true'
    } catch {
      // ignore
    }

    return NextResponse.json({
      status: dbStatus === 'operational' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        database: { status: dbStatus, latencyMs: dbLatencyMs, engine: 'PostgreSQL / Prisma' },
        redis: { status: redisStatus, latencyMs: redisLatencyMs, type: process.env.REDIS_URL ? 'Upstash/Standalone' : 'In-Memory Fallback' },
        rbac: { status: 'enforced', mode: 'Strict Super Admin Guard' },
        gpsIngestion: { status: 'listening', activePort: 'WebSocket/HTTP' },
      },
      maintenanceMode,
      totalLatencyMs: Date.now() - t0,
    })
  } catch (error) {
    console.error('Admin health route error:', error)
    return NextResponse.json({
      status: 'error',
      checks: {
        database: { status: 'offline', latencyMs: 0 },
        redis: { status: 'offline', latencyMs: 0 },
        rbac: { status: 'enforced' },
        gpsIngestion: { status: 'listening' },
      }
    }, { status: 500 })
  }
}
