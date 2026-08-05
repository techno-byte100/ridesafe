import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: fetch all settings as a key-value map
export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = await prisma.systemSetting.findMany()
    const map: Record<string, string> = {}
    settings.forEach(s => { map[s.key] = s.value })

    // Return structured useful settings with sane defaults
    return NextResponse.json({
      schoolName: map['SCHOOL_NAME'] || 'RideSafe School',
      pickupTimes: JSON.parse(map['PICKUP_TIMES'] || '["3:00 PM","4:00 PM","5:00 PM"]'),
      schoolLat: map['schoolLat'] || '3.1390',
      schoolLng: map['schoolLng'] || '101.6869',
      geofenceRadius: map['geofenceRadius'] || '500',
    })
  } catch (error) {
    console.error('Admin settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: update settings
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const updates: { key: string; value: string }[] = []

    if (body.schoolName !== undefined) updates.push({ key: 'SCHOOL_NAME', value: body.schoolName })
    if (body.pickupTimes !== undefined) updates.push({ key: 'PICKUP_TIMES', value: JSON.stringify(body.pickupTimes) })
    if (body.schoolLat !== undefined) updates.push({ key: 'schoolLat', value: String(body.schoolLat) })
    if (body.schoolLng !== undefined) updates.push({ key: 'schoolLng', value: String(body.schoolLng) })
    if (body.geofenceRadius !== undefined) updates.push({ key: 'geofenceRadius', value: String(body.geofenceRadius) })

    await Promise.all(updates.map(u =>
      prisma.systemSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value }
      })
    ))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin settings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
