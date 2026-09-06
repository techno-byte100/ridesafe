import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (user.role === 'DRIVER') {
            // Driver gets their trips
            const trips = await prisma.trip.findMany({
                where: { driverId: user.id },
                include: { route: { include: { stops: { orderBy: { order: 'asc' } } } } },
                orderBy: { date: 'desc' },
                take: 10
            })
            return NextResponse.json({ trips })
        } else if (user.role === 'PARENT') {
            // Parent gets active trips for their kids
            const students = await prisma.student.findMany({ where: { parentId: user.id } })
            const routeIds = students.map(s => s.routeId).filter(Boolean) as string[]
            const trips = await prisma.trip.findMany({
                where: { routeId: { in: routeIds }, status: { not: 'TRIP_COMPLETED' } },
                include: { route: true, driver: { select: { name: true, phone: true } } }
            })
            return NextResponse.json({ trips })
        } else {
            // Admin gets all active/recent trips
            const trips = await prisma.trip.findMany({
                include: { route: true, driver: { select: { name: true } }, bus: { select: { plateNumber: true } } },
                orderBy: { date: 'desc' },
                take: 50
            })
            return NextResponse.json({ trips })
        }
    } catch (error) {
        console.error('Trips GET Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const data = await request.json()
        if (user.role === 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const driverId = user.role === 'DRIVER' ? user.id : data.driverId
        if (!driverId || !data.routeId) {
            return NextResponse.json({ error: 'Missing driverId or routeId' }, { status: 400 })
        }

        const trip = await prisma.trip.create({
            data: {
                routeId: data.routeId,
                driverId: driverId,
                busId: data.busId,
                status: 'TRIP_CREATED'
            }
        })

        return NextResponse.json({ trip })
    } catch (error) {
        console.error('Trips POST Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
