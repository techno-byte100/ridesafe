import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'
import { logAudit } from '@/lib/services/auditService'
import { ensureSuperAdminSchema } from '@/lib/db/ensureSchema'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN']

export async function GET(request: NextRequest) {
  try {
    const auth = await getUserFromSession()
    if (!auth || !ADMIN_ROLES.includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureSuperAdminSchema()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') || undefined
    const routeId = searchParams.get('routeId') || undefined
    const grade = searchParams.get('grade') || undefined

    const where: Record<string, unknown> = {}
    if (organizationId) where.organizationId = organizationId
    if (routeId) where.routeId = routeId
    if (grade) where.grade = grade

    const students = await prisma.student.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, email: true, phone: true } },
        route: {
          select: {
            id: true,
            name: true,
            buses: {
              select: {
                id: true,
                plateNumber: true,
                driver: { select: { id: true, name: true, phone: true } }
              }
            }
          }
        },
        pickupStop: { select: { id: true, name: true, latitude: true, longitude: true } },
        dropoffStop: { select: { id: true, name: true, latitude: true, longitude: true } },
        attendances: {
          take: 1,
          orderBy: { timestamp: 'desc' },
          select: {
            id: true,
            action: true,
            timestamp: true,
            parentConfirmedPickup: true,
            parentConfirmedDropoff: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Admin student list error:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromSession()
    if (!auth || !ADMIN_ROLES.includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureSuperAdminSchema()

    const body = await request.json()
    const {
      name, grade, level, parentContact1, parentContact2,
      parentId, routeId, pickupStopId, dropoffStopId, organizationId,
      pickupTime, isSelfPickup, selfPickupSession, status
    } = body

    if (!name || !grade || !level || !parentContact1) {
      return NextResponse.json({ error: 'Name, grade, level, and primary parent contact are required' }, { status: 400 })
    }

    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        grade: grade.trim(),
        level: level.trim(),
        parentContact1: parentContact1.trim(),
        parentContact2: parentContact2?.trim() || null,
        parentId: parentId || null,
        routeId: routeId || null,
        pickupStopId: pickupStopId || null,
        dropoffStopId: dropoffStopId || null,
        organizationId: organizationId || null,
        pickupTime: pickupTime || null,
        isSelfPickup: Boolean(isSelfPickup),
        selfPickupSession: selfPickupSession || null,
        status: status || 'PENDING'
      },
      include: {
        organization: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, email: true, phone: true } },
        route: { select: { id: true, name: true } }
      }
    })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
    await logAudit({
      userId: auth.id,
      action: 'CREATE_STUDENT',
      target: 'Student',
      targetId: student.id,
      details: { name: student.name, grade: student.grade, parentId: student.parentId, routeId: student.routeId },
      ipAddress: ip,
    })

    return NextResponse.json({ student })
  } catch (error) {
    console.error('Admin student create error:', error)
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getUserFromSession()
    if (!auth || !ADMIN_ROLES.includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureSuperAdminSchema()

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (updates.name !== undefined) updateData.name = updates.name.trim()
    if (updates.grade !== undefined) updateData.grade = updates.grade.trim()
    if (updates.level !== undefined) updateData.level = updates.level.trim()
    if (updates.parentContact1 !== undefined) updateData.parentContact1 = updates.parentContact1.trim()
    if (updates.parentContact2 !== undefined) updateData.parentContact2 = updates.parentContact2?.trim() || null
    if (updates.parentId !== undefined) updateData.parentId = updates.parentId || null
    if (updates.routeId !== undefined) updateData.routeId = updates.routeId || null
    if (updates.pickupStopId !== undefined) updateData.pickupStopId = updates.pickupStopId || null
    if (updates.dropoffStopId !== undefined) updateData.dropoffStopId = updates.dropoffStopId || null
    if (updates.organizationId !== undefined) updateData.organizationId = updates.organizationId || null
    if (updates.pickupTime !== undefined) updateData.pickupTime = updates.pickupTime || null
    if (updates.isSelfPickup !== undefined) updateData.isSelfPickup = Boolean(updates.isSelfPickup)
    if (updates.selfPickupSession !== undefined) updateData.selfPickupSession = updates.selfPickupSession || null
    if (updates.status !== undefined) updateData.status = updates.status

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        organization: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, email: true, phone: true } },
        route: { select: { id: true, name: true } }
      }
    })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
    await logAudit({
      userId: auth.id,
      action: 'UPDATE_STUDENT',
      target: 'Student',
      targetId: id,
      details: { updates: updateData },
      ipAddress: ip,
    })

    return NextResponse.json({ student })
  } catch (error) {
    console.error('Admin student update error:', error)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getUserFromSession()
    if (!auth || !ADMIN_ROLES.includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    await prisma.attendance.deleteMany({ where: { studentId: id } })
    await prisma.student.delete({ where: { id } })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
    await logAudit({
      userId: auth.id,
      action: 'DELETE_STUDENT',
      target: 'Student',
      targetId: id,
      ipAddress: ip,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin student delete error:', error)
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
  }
}
