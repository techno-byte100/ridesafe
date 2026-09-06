import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN']

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id } = await params
        const data = await request.json()

        if (user.role === 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const trip = await prisma.trip.findUnique({
            where: { id },
            include: {
                route: {
                    include: {
                        students: { select: { parentId: true } }
                    }
                }
            }
        })
        if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (user.role === 'DRIVER' && trip.driverId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Build update payload
        const updatePayload: {
            status?: string;
            delayMinutes?: number;
            delayReason?: string;
        } = {}

        if (data.status) updatePayload.status = data.status
        if (data.delayMinutes !== undefined) updatePayload.delayMinutes = Number(data.delayMinutes)
        if (data.delayReason !== undefined) updatePayload.delayReason = data.delayReason

        const updated = await prisma.trip.update({
            where: { id },
            data: updatePayload
        })

        // ── Delay Notification to All Route Parents ───────────────────────────
        if (data.delayMinutes !== undefined && Number(data.delayMinutes) > 0) {
            const parentIds = new Set(
                trip.route.students
                    .map(s => s.parentId)
                    .filter((pid): pid is string => pid !== null)
            )

            if (parentIds.size > 0) {
                const reason = data.delayReason || 'Unspecified reason'
                const mins = Number(data.delayMinutes)
                await prisma.notification.createMany({
                    data: Array.from(parentIds).map(parentId => ({
                        userId: parentId,
                        title: `⚠️ Delay Notice: ${trip.route.name}`,
                        body: `Route "${trip.route.name}" is running approximately ${mins} minute${mins !== 1 ? 's' : ''} late due to: ${reason}. Please expect a later arrival.`,
                        type: 'WARNING'
                    }))
                }).catch(err => console.error('Failed to send delay notifications:', err))
            }
        }

        return NextResponse.json({ trip: updated })
    } catch (error) {
        console.error('Trip PATCH Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id } = await params
        const trip = await prisma.trip.findUnique({
            where: { id },
            include: {
                route: { select: { id: true, name: true } },
                driver: { select: { id: true, name: true } },
                bus: { select: { plateNumber: true } },
            }
        })

        if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        // Parents can only see trips for their children's routes
        if (user.role === 'PARENT') {
            const studentOnRoute = await prisma.student.findFirst({
                where: { parentId: user.id, routeId: trip.routeId }
            })
            if (!studentOnRoute) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        } else if (user.role === 'DRIVER' && trip.driverId !== user.id) {
            if (!ADMIN_ROLES.includes(user.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        return NextResponse.json({ trip })
    } catch (error) {
        console.error('Trip GET Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

