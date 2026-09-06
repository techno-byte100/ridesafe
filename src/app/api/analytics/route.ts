import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Fetch all data in parallel
    const [students, trips, notifications, attendances] = await Promise.all([
      prisma.student.findMany({ select: { id: true, status: true, isSelfPickup: true } }),
      prisma.trip.findMany({
        where: { date: { gte: sevenDaysAgo } },
        select: { id: true, status: true, date: true }
      }),
      prisma.notification.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { id: true, type: true, createdAt: true }
      }),
      prisma.attendance.findMany({
        where: { timestamp: { gte: sevenDaysAgo } },
        select: { id: true, action: true, timestamp: true }
      }),
    ])

    // ── Student Status Breakdown (Pie Chart) ─────────────────────────────
    const checkedIn = students.filter(s => s.status === 'CHECKED_OUT').length
    const pending = students.filter(s => s.status === 'PENDING').length
    const selfPickup = students.filter(s => s.isSelfPickup).length
    const statusBreakdown = [
      { name: 'Checked In', value: checkedIn, color: '#10B981' },
      { name: 'Pending', value: pending, color: '#F59E0B' },
      { name: 'Self Pickup', value: selfPickup, color: '#3B82F6' },
    ]

    // ── Trips Per Day (Bar Chart) ────────────────────────────────────────
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const tripsPerDay = Array(7).fill(0)
    trips.forEach(t => {
      const day = new Date(t.date).getDay()
      tripsPerDay[day]++
    })
    const tripsBarData = dayNames.map((name, i) => ({ day: name, trips: tripsPerDay[i] }))

    // ── Attendance Trend (Line Chart) ────────────────────────────────────
    const trendMap: Record<string, { pickups: number; dropoffs: number; absent: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      trendMap[key] = { pickups: 0, dropoffs: 0, absent: 0 }
    }
    attendances.forEach(a => {
      const key = new Date(a.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (trendMap[key]) {
        if (a.action === 'PICKED_UP') trendMap[key].pickups++
        else if (a.action === 'DROPPED_OFF') trendMap[key].dropoffs++
        else if (a.action === 'ABSENT') trendMap[key].absent++
      }
    })
    const trendData = Object.entries(trendMap).map(([date, vals]) => ({ date, ...vals }))

    // ── Notification Breakdown (Pie) ─────────────────────────────────────
    const infoCount = notifications.filter(n => n.type === 'INFO').length
    const warnCount = notifications.filter(n => n.type === 'WARNING').length
    const emergCount = notifications.filter(n => n.type === 'EMERGENCY').length
    const notifBreakdown = [
      { name: 'Info', value: infoCount, color: '#3B82F6' },
      { name: 'Warning', value: warnCount, color: '#F59E0B' },
      { name: 'Emergency', value: emergCount, color: '#EF4444' },
    ]

    // ── KPI Metrics ──────────────────────────────────────────────────────
    const totalTrips = trips.length
    const completedTrips = trips.filter(t => t.status === 'TRIP_COMPLETED').length
    const completionRate = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0
    const totalAttendances = attendances.length
    const absentCount = attendances.filter(a => a.action === 'ABSENT').length
    const onTimeRate = totalAttendances > 0 ? Math.round(((totalAttendances - absentCount) / totalAttendances) * 100) : 100

    return NextResponse.json({
      statusBreakdown,
      tripsBarData,
      trendData,
      notifBreakdown,
      kpis: {
        totalStudents: students.length,
        totalTrips,
        completedTrips,
        completionRate,
        onTimeRate,
        totalAttendances,
        absentCount,
      }
    })
  } catch (e) {
    console.error('Analytics Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
