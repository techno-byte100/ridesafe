import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user || user.role !== 'DRIVER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { latitude, longitude } = await req.json()

        // Create a new emergency alert
        const alert = await prisma.emergencyAlert.create({
            data: {
                driverId: user.id,
                latitude: latitude || null,
                longitude: longitude || null,
                resolved: false
            }
        })

        // Find active trip for driver to get assigned students' parents
        const activeTrip = await prisma.trip.findFirst({
            where: {
                driverId: user.id,
                status: { in: ['DRIVER_STARTED_ROUTE', 'BUS_EN_ROUTE'] }
            },
            include: {
                route: {
                    include: {
                        students: true
                    }
                }
            }
        });

        const notificationsToCreate: Array<{ userId: string, title: string, body: string, type: string }> = [];

        // Notify Parents on this route
        if (activeTrip && activeTrip.route.students.length > 0) {
            const parentIds = new Set(
                activeTrip.route.students
                    .map(s => s.parentId)
                    .filter((id): id is string => id !== null)
            );
            parentIds.forEach(parentId => {
                notificationsToCreate.push({
                    userId: parentId,
                    title: '🚨 EMERGENCY ALERT',
                    body: `The driver for ${activeTrip.route.name} has triggered an emergency alert. Please contact the school immediately.`,
                    type: 'EMERGENCY'
                });
            });
        }

        // Notify all Admins
        const admins = await prisma.user.findMany({
            where: { role: { in: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] } },
            select: { id: true, name: true }
        });

        admins.forEach(admin => {
            notificationsToCreate.push({
                userId: admin.id,
                title: '🚨 DRIVER EMERGENCY',
                // @ts-expect-error Prisma generated types lag on select
                body: `Emergency panic button triggered by ${user.name}${activeTrip ? ` on route ${activeTrip.route.name}` : ''}.`,
                type: 'EMERGENCY'
            });
        });

        if (notificationsToCreate.length > 0) {
            await prisma.notification.createMany({
                data: notificationsToCreate
            });
        }

        return NextResponse.json({ success: true, alert })
    } catch (error) {
        console.error('Error creating emergency alert:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET() {
    try {
        const user = await getUserFromSession()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only get active (unresolved) emergencies from the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

        const activeAlerts = await prisma.emergencyAlert.findMany({
            where: {
                resolved: false,
                timestamp: {
                    gte: twentyFourHoursAgo
                }
            },
            include: {
                driver: {
                    select: {
                        name: true,
                        phone: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' }
        })

        return NextResponse.json({ alerts: activeAlerts })
    } catch (error) {
        console.error('Error fetching emergency alerts:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
