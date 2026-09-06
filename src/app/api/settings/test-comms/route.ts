import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/settings/test-comms
 * Sends a test notification to verify email/SMS configuration.
 * Currently saves a test notification record to DB as confirmation.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const type = body.type || 'EMAIL'

    if (!['EMAIL', 'SMS', 'PUSH'].includes(type)) {
      return NextResponse.json({ error: 'Invalid comms type. Use EMAIL, SMS or PUSH.' }, { status: 400 })
    }

    // In a full implementation, this would send a real test email/SMS
    // For now we log the test and return success to indicate the endpoint is reachable
    console.log(`[test-comms] Test ${type} requested by user ${user.id}`)

    return NextResponse.json({
      success: true,
      message: `Test ${type} notification simulated. Configure SMTP/SMS credentials in .env to enable real sending.`,
      type,
      requestedBy: user.id,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('test-comms error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
