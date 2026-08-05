import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession()
    if (!user || !['ADMIN','SUPER_ADMIN','SCHOOL_ADMIN'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { driverId, date, startTime, endTime } = await req.json()
    if (!driverId || !date || !startTime || !endTime)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const shift = await prisma.driverShift.create({ data: { driverId, date: new Date(date), startTime, endTime } })
    return NextResponse.json({ shift })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const where = user.role === 'DRIVER' ? { driverId: user.id } : {}
    const shifts = await prisma.driverShift.findMany({
      where, orderBy: { date: 'asc' }, take: 50,
      include: { driver: { select: { name: true, phone: true } } }
    })
    return NextResponse.json({ shifts })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
