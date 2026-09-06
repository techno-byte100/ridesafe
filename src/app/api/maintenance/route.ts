import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession()
    if (!user || !['ADMIN','SUPER_ADMIN','SCHOOL_ADMIN'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { busId, type, description, scheduledDate, cost } = await req.json()
    if (!busId || !type || !scheduledDate)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const log = await prisma.maintenanceLog.create({
      data: { busId, type, description, scheduledDate: new Date(scheduledDate), cost: cost || null }
    })
    return NextResponse.json({ log })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const logs = await prisma.maintenanceLog.findMany({
      orderBy: { scheduledDate: 'asc' }, take: 100,
      include: { bus: { select: { plateNumber: true, status: true } } }
    })
    return NextResponse.json({ logs })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getUserFromSession()
    if (!user || !['ADMIN','SUPER_ADMIN','SCHOOL_ADMIN'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id, status, completedDate } = await req.json()
    const log = await prisma.maintenanceLog.update({
      where: { id },
      data: { status, completedDate: completedDate ? new Date(completedDate) : undefined }
    })
    return NextResponse.json({ log })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
