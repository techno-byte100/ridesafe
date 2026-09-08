import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/auth'
import { getAuditLogs } from '@/lib/services/auditService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromSession()
    if (!auth || auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
    const userId = url.searchParams.get('userId') || undefined
    const action = url.searchParams.get('action') || undefined
    const target = url.searchParams.get('target') || undefined
    const fromStr = url.searchParams.get('from')
    const toStr = url.searchParams.get('to')

    const from = fromStr ? new Date(fromStr) : undefined
    const to = toStr ? new Date(toStr) : undefined

    const result = await getAuditLogs({ page, limit, userId, action, target, from, to })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Audit log GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
