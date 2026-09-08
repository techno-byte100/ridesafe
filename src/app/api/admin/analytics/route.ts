import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getUserFromSession()
    if (!auth || auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ensureSuperAdminSchema } = await import('@/lib/db/ensureSchema')
    await ensureSuperAdminSchema()

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Run all queries in parallel
    const [
      totalOrgs,
      activeOrgs,
      totalUsers,
      totalStudents,
      totalBuses,
      totalTrips,
      activeTrips,
      completedTrips30d,
      totalAttendances30d,
      totalPayments,
      paidPayments,
      newUsers7d,
      newStudents7d,
      unresolvedEmergencies,
      orgBreakdown,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.student.count(),
      prisma.bus.count(),
      prisma.trip.count(),
      prisma.trip.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.trip.count({ where: { status: 'COMPLETED', date: { gte: thirtyDaysAgo } } }),
      prisma.attendance.count({ where: { timestamp: { gte: thirtyDaysAgo } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } }),
      prisma.payment.count({ where: { status: 'PAID' } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.student.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.emergencyAlert.count({ where: { resolved: false } }),
      prisma.organization.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          subscriptionTier: true,
          _count: { select: { users: true, students: true, buses: true, routes: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    // Role breakdown
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    })
    const roleBreakdown: Record<string, number> = {}
    roleCounts.forEach(r => { roleBreakdown[r.role] = r._count.role })

    // Trip status breakdown (last 30 days)
    const tripStatusCounts = await prisma.trip.groupBy({
      by: ['status'],
      _count: { status: true },
      where: { date: { gte: thirtyDaysAgo } },
    })
    const tripBreakdown: Record<string, number> = {}
    tripStatusCounts.forEach(t => { tripBreakdown[t.status] = t._count.status })

    return NextResponse.json({
      overview: {
        totalOrgs,
        activeOrgs,
        totalUsers,
        totalStudents,
        totalBuses,
        totalTrips,
        activeTrips,
        unresolvedEmergencies,
      },
      trends: {
        completedTrips30d,
        totalAttendances30d,
        newUsers7d,
        newStudents7d,
      },
      revenue: {
        totalPaid: totalPayments._sum.amount || 0,
        paidInvoices: paidPayments,
      },
      roleBreakdown,
      tripBreakdown,
      orgBreakdown,
    })
  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
