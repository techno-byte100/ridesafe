import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/trips/active
 * Returns the currently active trip for the authenticated user's children's routes.
 * Used by the Parent app to:
 *   1. Show delay notices (delayMinutes, delayReason)
 *   2. Know the tripId to submit confirmation attendance actions
 */
export async function GET() {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

        if (user.role === 'PARENT') {
            // Find the student(s) linked to this parent
            const students = await prisma.student.findMany({
                where: { parentId: user.id },
                select: { routeId: true }
            })
            const routeIds = students.map(s => s.routeId).filter((id): id is string => id !== null)

            if (routeIds.length === 0) {
                return NextResponse.json({ trip: null })
            }

            // Find the most recent non-completed trip for this student's routes
            const trip = await prisma.trip.findFirst({
                where: {
                    routeId: { in: routeIds },
                    status: { not: 'TRIP_COMPLETED' },
                    date: { gte: oneDayAgo }
                },
                orderBy: { date: 'desc' },
                include: {
                    route: { select: { name: true } }
                }
            })

            if (!trip) return NextResponse.json({ trip: null })

            return NextResponse.json({
                trip: {
                    id: trip.id,
                    routeName: trip.route.name,
                    status: trip.status,
                    delayMinutes: trip.delayMinutes || 0,
                    delayReason: trip.delayReason || null,
                    date: trip.date
                }
            })
        }

        // For drivers — return their own active trip
        if (user.role === 'DRIVER') {
            const trip = await prisma.trip.findFirst({
                where: {
                    driverId: user.id,
                    status: { not: 'TRIP_COMPLETED' },
                    date: { gte: oneDayAgo }
                },
                orderBy: { date: 'desc' },
                include: {
                    route: { select: { name: true } }
                }
            })

            if (!trip) return NextResponse.json({ trip: null })

            return NextResponse.json({
                trip: {
                    id: trip.id,
                    routeName: trip.route.name,
                    status: trip.status,
                    delayMinutes: trip.delayMinutes || 0,
                    delayReason: trip.delayReason || null,
                    date: trip.date
                }
            })
        }

        return NextResponse.json({ trip: null })
    } catch (error) {
        console.error('Active Trip GET Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
