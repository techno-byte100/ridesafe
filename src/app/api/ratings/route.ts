import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

// POST — submit a ride rating
export async function POST(req: Request) {
  try {
    const user = await getUserFromSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    let { tripId, rating, comment } = await req.json()
    if (!tripId || !rating || rating < 1 || rating > 5)
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })

    if (tripId === 'latest') {
      const student = await prisma.student.findFirst({ where: { parentId: user.id } })
      if (!student || !student.routeId) {
        return NextResponse.json({ error: 'No student/route found for parent' }, { status: 404 })
      }
      const latestTrip = await prisma.trip.findFirst({
        where: { routeId: student.routeId },
        orderBy: { date: 'desc' }
      })
      if (!latestTrip) return NextResponse.json({ error: 'No recent trip found' }, { status: 404 })
      tripId = latestTrip.id
    }

    const existing = await prisma.rideRating.findFirst({ where: { tripId, parentId: user.id } })
    if (existing) return NextResponse.json({ error: 'Already rated this trip' }, { status: 409 })

    const r = await prisma.rideRating.create({
      data: { tripId, parentId: user.id, rating, comment: comment || null }
    })
    return NextResponse.json({ rating: r })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET — get ratings (admin: all, parent: own)
export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const where = ['ADMIN','SUPER_ADMIN','SCHOOL_ADMIN'].includes(user.role) ? {} : { parentId: user.id }
    const ratings = await prisma.rideRating.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 50,
      include: { trip: { select: { id: true, date: true, route: { select: { name: true } } } }, parent: { select: { name: true } } }
    })
    const avg = ratings.length > 0 ? (ratings.reduce((a, r) => a + r.rating, 0) / ratings.length).toFixed(1) : '0'
    return NextResponse.json({ ratings, averageRating: avg })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
