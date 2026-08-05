import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN']

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user || !ADMIN_ROLES.includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get('date') || new Date().toISOString().slice(0, 10)
        const routeId = searchParams.get('routeId') || undefined

        const dayStart = new Date(`${dateParam}T00:00:00.000Z`)
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        if (isNaN(dayStart.getTime())) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
        }

        const trips = await prisma.trip.findMany({
            where: { date: { gte: dayStart, lt: dayEnd }, ...(routeId ? { routeId } : {}) },
            orderBy: { date: 'asc' },
            include: {
                route: { select: { id: true, name: true } },
                driver: { select: { id: true, name: true } },
                bus: { select: { plateNumber: true } },
                attendances: {
                    orderBy: { timestamp: 'asc' },
                    include: { student: { select: { id: true, name: true, grade: true } } }
                }
            }
        })

        const routeIds = [...new Set(trips.map(t => t.routeId))]
        const rosterByRoute = new Map<string, { id: string; name: string; grade: string }[]>()
        if (routeIds.length > 0) {
            const students = await prisma.student.findMany({
                where: { routeId: { in: routeIds } },
                select: { id: true, name: true, grade: true, routeId: true }
            })
            for (const s of students) {
                if (!s.routeId) continue
                if (!rosterByRoute.has(s.routeId)) rosterByRoute.set(s.routeId, [])
                rosterByRoute.get(s.routeId)!.push({ id: s.id, name: s.name, grade: s.grade })
            }
        }

        const result = trips.map(t => {
            // Latest attendance record per student (in case of duplicate taps)
            const latestByStudent = new Map<string, typeof t.attendances[number]>()
            for (const a of t.attendances) latestByStudent.set(a.studentId, a)

            const roster = (rosterByRoute.get(t.routeId) || []).map(s => {
                const a = latestByStudent.get(s.id)
                return {
                    studentId: s.id, name: s.name, grade: s.grade,
                    status: a?.action || 'NOT_MARKED',
                    attendanceId: a?.id || null,
                    timestamp: a?.timestamp || null,
                }
            })

            return {
                tripId: t.id, date: t.date, status: t.status,
                routeId: t.route.id, routeName: t.route.name,
                driverName: t.driver.name, busPlate: t.bus?.plateNumber || null,
                roster,
            }
        })

        return NextResponse.json({ trips: result, date: dateParam })
    } catch (error) {
        console.error('Attendance GET Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Drivers log attendance during a trip; admins can correct/backfill records
        if (user.role !== 'DRIVER' && !ADMIN_ROLES.includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const data = await request.json()
        if (!data.tripId || !data.studentId || !data.action) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

        const attendance = await prisma.attendance.create({
            data: {
                tripId: data.tripId,
                studentId: data.studentId,
                stopId: data.stopId, // Optional
                action: data.action,
                latitude: dbUser?.lastLatitude || null,
                longitude: dbUser?.lastLongitude || null
            }
        })

        // Auto-create a notification for the parent
        const student = await prisma.student.findUnique({ where: { id: data.studentId } })
        if (student?.parentId) {
            const verb = data.action === 'PICKED_UP' ? 'picked up' : (data.action === 'DROPPED_OFF' ? 'dropped off' : 'marked absent')
            await prisma.notification.create({
                data: {
                    userId: student.parentId,
                    title: `Student Update`,
                    body: `${student.name} was ${verb}.`,
                    type: 'INFO'
                }
            })
        }

        // ── Bus Capacity / Overcrowding Alert ────────────────────────────
        if (data.action === 'PICKED_UP') {
            const trip = await prisma.trip.findUnique({ where: { id: data.tripId }, select: { busId: true } })
            if (trip?.busId) {
                const bus = await prisma.bus.findUnique({ where: { id: trip.busId }, select: { capacity: true, plateNumber: true } })
                if (bus) {
                    const onBoard = await prisma.attendance.count({
                        where: { tripId: data.tripId, action: 'PICKED_UP' }
                    })
                    const droppedOff = await prisma.attendance.count({
                        where: { tripId: data.tripId, action: 'DROPPED_OFF' }
                    })
                    const currentOnBoard = onBoard - droppedOff
                    const ratio = currentOnBoard / bus.capacity

                    if (ratio >= 1) {
                        // OVER CAPACITY
                        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
                        await prisma.notification.createMany({
                            data: admins.map(a => ({
                                userId: a.id,
                                title: '🚨 Overcrowding Alert',
                                body: `Bus ${bus.plateNumber} has ${currentOnBoard}/${bus.capacity} passengers — OVER CAPACITY!`,
                                type: 'EMERGENCY',
                            }))
                        }).catch(() => {})
                    } else if (ratio >= 0.9) {
                        // 90% warning
                        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
                        await prisma.notification.createMany({
                            data: admins.map(a => ({
                                userId: a.id,
                                title: '⚠️ Bus Nearly Full',
                                body: `Bus ${bus.plateNumber} is at ${currentOnBoard}/${bus.capacity} capacity (${Math.round(ratio * 100)}%).`,
                                type: 'WARNING',
                            }))
                        }).catch(() => {})
                    }
                }
            }
        }

        return NextResponse.json({ attendance })
    } catch (error) {
        console.error('Attendance POST Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
