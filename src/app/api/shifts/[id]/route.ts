import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromSession()
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const { driverId, date, startTime, endTime, status } = await req.json()

    const shift = await prisma.driverShift.update({
      where: { id },
      data: {
        ...(driverId && { driverId }),
        ...(date && { date: new Date(date) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(status && { status }),
      },
    })
    return NextResponse.json({ shift })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromSession()
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await prisma.driverShift.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
