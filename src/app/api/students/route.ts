import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let students;

    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'SCHOOL_ADMIN') {
      // Admins see all students
      students = await prisma.student.findMany({
        include: { parent: { select: { name: true, phone: true } }, route: { select: { id: true, name: true } } }
      })
    } else if (user.role === 'DRIVER') {
      // Drivers see all students for the daily bus list
      students = await prisma.student.findMany({
        include: { parent: { select: { name: true, phone: true } }, route: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' }
      })
    } else if (user.role === 'PARENT') {
      // Parents see only their own students with stop and route details
      students = await prisma.student.findMany({
        where: { parentId: user.id },
        include: {
          pickupStop: true,
          dropoffStop: true,
          route: { select: { id: true, name: true, morningTime: true, afternoonTime: true } },
          attendances: {
            take: 5,
            orderBy: { timestamp: 'desc' },
            include: { trip: { select: { id: true, date: true, status: true } } }
          }
        }
      })
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || (!['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(user.role))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Validate required fields
    const { name, grade, level, parentContact1, parentContact2, isSelfPickup, selfPickupSession, routeId, parentId } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Student name must be at least 2 characters' }, { status: 400 })
    }
    if (!grade || typeof grade !== 'string' || !grade.trim()) {
      return NextResponse.json({ error: 'Grade is required' }, { status: 400 })
    }
    if (!parentContact1 || typeof parentContact1 !== 'string' || !parentContact1.trim()) {
      return NextResponse.json({ error: 'Primary parent contact is required' }, { status: 400 })
    }

    const studentData: Record<string, unknown> = {
      name: name.trim(),
      grade: grade.trim(),
      level: (level || 'Primary').trim(),
      parentContact1: parentContact1.trim(),
      parentContact2: parentContact2?.trim() || null,
      isSelfPickup: Boolean(isSelfPickup),
      selfPickupSession: selfPickupSession || null,
      routeId: routeId || null,
      parentId: parentId || null,
    }

    const student = await prisma.student.create({ data: studentData as Parameters<typeof prisma.student.create>[0]['data'] })

    return NextResponse.json({ student })
  } catch (error) {
    console.error('Error creating student:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { studentId, status } = body

    if (!studentId || !status) {
      return NextResponse.json({ error: 'Student ID and status are required' }, { status: 400 })
    }

    // Verify ownership if role is PARENT
    if (user.role === 'PARENT') {
      const owned = await prisma.student.findFirst({
        where: { id: studentId, parentId: user.id }
      })
      if (!owned) {
        return NextResponse.json({ error: 'Forbidden: Student not associated with parent account' }, { status: 403 })
      }
    } else if (!['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { status }
    })

    return NextResponse.json({ student: updatedStudent })
  } catch (error) {
    console.error('Error updating student transit status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

