import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const regId = req.nextUrl.searchParams.get('regId')
    if (!regId) {
      return NextResponse.json({ error: 'Missing regId' }, { status: 400 })
    }

    const pending = await prisma.pendingRegistration.findUnique({ where: { id: regId } })
    if (!pending) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    const payload: Record<string, unknown> = {
      status: pending.status,
      studentName: pending.studentName,
      parentEmail: pending.parentEmail,
      mockMode: pending.billUrl?.startsWith('/register/mock-pay/') || false,
      billUrl: pending.status === 'PENDING' ? pending.billUrl : undefined,
    }

    // One-time reveal of the generated password, then wipe it server-side.
    if (pending.status === 'PAID' && pending.tempPassword) {
      payload.tempPassword = pending.tempPassword
      await prisma.pendingRegistration.update({ where: { id: regId }, data: { tempPassword: null } })
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Registration status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
