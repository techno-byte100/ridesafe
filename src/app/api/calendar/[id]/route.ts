import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

// Next.js 15: params is now a Promise
type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getUserFromSession()
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (session.role !== 'SUPER_ADMIN') {
      const user = await prisma.user.findUnique({ where: { id: session.id }, select: { organizationId: true } })
      const existing = await prisma.academicEvent.findUnique({ where: { id }, select: { organizationId: true } })
      if (!existing || (existing.organizationId && existing.organizationId !== user?.organizationId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { title, description, startDate, endDate, type, isPublic, color } = body

    if (title !== undefined && !String(title).trim()) {
      return NextResponse.json({ error: 'Title cannot be only spaces' }, { status: 400 })
    }

    const updatedEvent = await prisma.academicEvent.update({
      where: { id },
      data: {
        title: title !== undefined ? String(title).trim() : undefined,
        description: description !== undefined ? (description && String(description).trim() ? String(description).trim() : null) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : endDate === null ? null : undefined,
        type,
        isPublic,
        color,
      },
    })

    return NextResponse.json({ event: updatedEvent })
  } catch (error) {
    console.error('Calendar PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getUserFromSession()
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (session.role !== 'SUPER_ADMIN') {
      const user = await prisma.user.findUnique({ where: { id: session.id }, select: { organizationId: true } })
      const existing = await prisma.academicEvent.findUnique({ where: { id }, select: { organizationId: true } })
      if (!existing || (existing.organizationId && existing.organizationId !== user?.organizationId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    await prisma.academicEvent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Calendar DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
