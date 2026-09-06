import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await req.json()

    // Find existing student
    const existing = await prisma.student.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    let updateData = {}

    if (user.role === 'PARENT') {
      // Parent can only update their own child's pickup preferences
      if (existing.parentId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Allow parent to update: isSelfPickup, pickupTime, photoUrl, parentContact2
      updateData = {
        ...(data.isSelfPickup !== undefined && { isSelfPickup: data.isSelfPickup }),
        ...(data.pickupTime !== undefined && { pickupTime: data.pickupTime }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
        ...(data.parentContact2 !== undefined && { parentContact2: data.parentContact2 }),
      }
    } else if (user.role === 'DRIVER') {
      // Driver can only update the status (e.g. CHECKED_OUT)
      updateData = {
        ...(data.status !== undefined && { status: data.status })
      }

      // Log the action for auditing
      if (data.status) {
        const action = data.status === 'CHECKED_OUT' ? 'PICKED_UP' : 'DROPPED_OFF';
        const driver = await prisma.user.findUnique({ select: { lastLatitude: true, lastLongitude: true }, where: { id: user.id } })

        const activeTrip = await prisma.trip.findFirst({
          where: { driverId: user.id, status: { in: ['DRIVER_STARTED_ROUTE', 'BUS_EN_ROUTE'] } }
        });

        if (activeTrip) {
          await prisma.attendance.create({
            data: {
              tripId: activeTrip.id,
              studentId: id,
              action: action,
              latitude: driver?.lastLatitude || null,
              longitude: driver?.lastLongitude || null
            }
          })
        }
      }
    } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'SCHOOL_ADMIN') {
      // Admin can update anything
      updateData = data
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const student = await prisma.student.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ student })
  } catch (error) {
    console.error('Error updating student:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromSession()
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.student.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    await prisma.attendance.deleteMany({ where: { studentId: id } })
    await prisma.student.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting student:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
