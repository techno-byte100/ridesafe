import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export async function GET() {
  try {
    const session = await getUserFromSession()
    const user = session ? await prisma.user.findUnique({ where: { id: session.id }, select: { role: true, organizationId: true } }) : null

    const isAdmin = user && ['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(user.role)
    const isSuperAdmin = user?.role === 'SUPER_ADMIN'

    // SUPER_ADMIN sees every organisation's events. Everyone else only sees
    // their own organisation's events plus legacy/global events (organizationId null).
    const orgScope = isSuperAdmin
      ? {}
      : { OR: [{ organizationId: user?.organizationId ?? null }, { organizationId: null }] }

    const events = await prisma.academicEvent.findMany({
      where: isAdmin ? orgScope : { ...orgScope, isPublic: true },
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Academic Calendar GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUserFromSession()
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.id }, select: { organizationId: true } })

    const body = await request.json()
    const { title, description, startDate, endDate, type, isPublic, color } = body

    if (!title || !String(title).trim() || !startDate) {
      return NextResponse.json({ error: 'Title and Start Date are required' }, { status: 400 })
    }

    const event = await prisma.academicEvent.create({
      data: {
        title: String(title).trim(),
        description: description && String(description).trim() ? String(description).trim() : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        type: type || 'EVENT',
        isPublic: isPublic !== undefined ? isPublic : true,
        color: color || '#1E3A8A',
        organizationId: user?.organizationId ?? null,
      }
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Academic Calendar POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
