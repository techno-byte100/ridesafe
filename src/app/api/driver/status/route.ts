import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user || user.role !== 'DRIVER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const activeTrip = await prisma.trip.findFirst({
            where: { driverId: user.id, status: { not: 'TRIP_COMPLETED' } },
            include: {
                route: {
                    include: {
                        stops: {
                            orderBy: { order: 'asc' },
                            include: {
                                pickupStudents: { select: { id: true, name: true, grade: true, photoUrl: true, isSelfPickup: true } },
                                dropoffStudents: { select: { id: true, name: true, grade: true, photoUrl: true, isSelfPickup: true } },
                                attendances: { where: { trip: { status: { not: 'TRIP_COMPLETED' } } } }
                            }
                        }
                    }
                }
            }
        })

        const bus = await prisma.bus.findFirst({
            where: { driverId: user.id },
            include: {
                route: {
                    include: {
                        stops: {
                            orderBy: { order: 'asc' }
                        },
                        students: { select: { id: true } }
                    }
                }
            }
        })

        // Auto-generate a qrToken for the bus if one doesn't exist yet
        let busQrToken = bus?.qrToken || null
        if (bus && !busQrToken) {
            busQrToken = 'QR-' + Math.random().toString(36).substring(2, 12).toUpperCase()
            await prisma.bus.update({ where: { id: bus.id }, data: { qrToken: busQrToken } })
        }

        return NextResponse.json({
            activeTrip,
            assignedRoute: bus?.route || null,
            busId: bus?.id || null,
            busPlate: bus?.plateNumber || null,
            busQrToken,
            driverId: user.id,
        })
    } catch (error) {
        console.error('Driver Status GET Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
