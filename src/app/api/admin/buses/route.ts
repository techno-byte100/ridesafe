import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const auth = await getUserFromSession()
        if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const buses = await prisma.bus.findMany({
            include: {
                driver: { select: { id: true, name: true, phone: true } },
                route: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ buses })
    } catch (error) {
        console.error('Bus list error:', error)
        return NextResponse.json({ error: 'Failed to fetch buses' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const auth = await getUserFromSession()
        if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { plateNumber, capacity, status, driverId, routeId, wialonUnitId, katsanaVehicleId } = await request.json()

        if (!plateNumber || !capacity) {
            return NextResponse.json({ error: 'Plate number and capacity are required' }, { status: 400 })
        }

        const bus = await prisma.bus.create({
            data: {
                plateNumber,
                capacity: parseInt(capacity),
                status: status || 'ACTIVE',
                driverId: driverId || null,
                routeId: routeId || null,
                wialonUnitId: wialonUnitId || null,
                katsanaVehicleId: katsanaVehicleId || null,
            } as any,
            include: {
                driver: true,
                route: true
            }
        })

        return NextResponse.json({ bus })
    } catch (error) {
        console.error('Bus create error:', error)
        return NextResponse.json({ error: 'Failed to create bus' }, { status: 500 })
    }
}
