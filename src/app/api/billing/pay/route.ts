import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { paymentId } = body

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })
    }

    // Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Ensure parent owns the payment (or user is admin)
    if (user.role === 'PARENT' && payment.parentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark as PAID
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      }
    })

    // Create a confirmation notification for the parent
    await prisma.notification.create({
      data: {
        userId: payment.parentId,
        title: '💳 Bus Fee Payment Successful',
        body: `Your payment of $${payment.amount.toFixed(2)} for school bus transport has been processed successfully. Receipt #${payment.id.slice(-6).toUpperCase()}`,
        type: 'INFO'
      }
    }).catch(() => {})

    return NextResponse.json({ success: true, payment: updated })
  } catch (error) {
    console.error('Payment Processing Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
