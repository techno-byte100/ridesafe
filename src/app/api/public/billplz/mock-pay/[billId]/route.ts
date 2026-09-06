import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { billplzAdapter } from '@/lib/adapters/billplz'
import { registrationService } from '@/lib/services/registrationService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ billId: string }> }) {
  try {
    const { billId } = await params
    const pending = await prisma.pendingRegistration.findUnique({ where: { billId } })
    if (!pending) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }
    return NextResponse.json({
      regId: pending.id,
      studentName: pending.studentName,
      parentName: pending.parentName,
      amount: pending.amount,
      status: pending.status,
    })
  } catch (error) {
    console.error('Mock pay lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Dev/test-only endpoint that simulates a Billplz payment outcome.
 * Only reachable when no real Billplz credentials are configured —
 * once real keys are set, this route refuses and the real webhook
 * (/api/public/billplz/callback) takes over.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ billId: string }> }) {
  try {
    if (billplzAdapter.isConfigured()) {
      return NextResponse.json({ error: 'Live Billplz is configured — mock payments are disabled' }, { status: 403 })
    }

    const { billId } = await params
    const { outcome } = await req.json().catch(() => ({ outcome: 'paid' }))

    const pending = await prisma.pendingRegistration.findUnique({ where: { billId } })
    if (!pending) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }
    if (pending.status === 'PAID') {
      return NextResponse.json({ success: true, status: 'PAID', regId: pending.id })
    }

    if (outcome === 'paid') {
      await registrationService.fulfillRegistration(pending.id)
      return NextResponse.json({ success: true, status: 'PAID', regId: pending.id })
    } else {
      await prisma.pendingRegistration.update({ where: { id: pending.id }, data: { status: 'FAILED' } })
      return NextResponse.json({ success: true, status: 'FAILED', regId: pending.id })
    }
  } catch (error) {
    console.error('Mock pay error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
