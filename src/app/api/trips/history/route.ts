import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 15
    const skip = (page - 1) * limit

    // Role-based filter
    const where: { driverId?: string; routeId?: { in: string[] } } = {}
    if (user.role === 'DRIVER') where.driverId = user.id
    if (user.role === 'PARENT') {
      // Get student route IDs
      const studentRouteIds = await prisma.student.findMany({
        where: { parentId: user.id }, select: { routeId: true }
      })
      const routeIds = studentRouteIds.map(s => s.routeId).filter(Boolean) as string[]
      if (routeIds.length > 0) where.routeId = { in: routeIds }
      else return NextResponse.json({ trips: [], total: 0, page })
    }

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where, orderBy: { date: 'desc' }, skip, take: limit,
        include: {
          route: { select: { name: true } },
          driver: { select: { name: true } },
          attendances: { select: { action: true } },
          ratings: { select: { rating: true } },
        }
      }),
      prisma.trip.count({ where })
    ])

    const formatted = trips.map(t => ({
      id: t.id, date: t.date, status: t.status,
      routeName: t.route.name, driverName: t.driver.name,
      attendanceCount: t.attendances.length,
      pickedUp: t.attendances.filter(a => a.action === 'PICKED_UP').length,
      droppedOff: t.attendances.filter(a => a.action === 'DROPPED_OFF').length,
      absent: t.attendances.filter(a => a.action === 'ABSENT').length,
      avgRating: t.ratings.length > 0 ? (t.ratings.reduce((a, r) => a + r.rating, 0) / t.ratings.length).toFixed(1) : null,
    }))

    return NextResponse.json({ trips: formatted, total, page, totalPages: Math.ceil(total / limit) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
