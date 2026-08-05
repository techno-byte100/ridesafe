import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { locationSchema, validateBody } from '@/lib/validation'
import { redisPublisher } from '@/lib/redis'
import { trackingService } from '@/lib/services/trackingService'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limiter: UserId -> LastUpdateTimestamp
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 5000;

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validation = validateBody(locationSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { latitude, longitude } = validation.data

    // Rate limiting: 1 req / 5 sec
    const now = Date.now();
    const lastUpdate = rateLimitMap.get(user.id);
    if (lastUpdate && now - lastUpdate < RATE_LIMIT_MS) {
      return NextResponse.json({ error: 'Too many requests. Please wait 5 seconds.' }, { status: 429 });
    }
    rateLimitMap.set(user.id, now);

    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, lastLatitude: true, lastLongitude: true, lastLocationUpdate: true, currentSpeedKmH: true }
    })

    let newSpeed = existingUser?.currentSpeedKmH || 30.0;
    if (existingUser?.lastLatitude && existingUser?.lastLongitude && existingUser?.lastLocationUpdate) {
      const distKm = calculateDistance(existingUser.lastLatitude, existingUser.lastLongitude, latitude, longitude);
      const hoursDiff = (Date.now() - existingUser.lastLocationUpdate.getTime()) / (1000 * 60 * 60);

      // Calculate instantaneous speed if time diff is reasonable (between 2 seconds and 1 hour)
      if (hoursDiff > (2 / 3600) && hoursDiff < 1) {
        const instantSpeed = distKm / hoursDiff;
        // Exponential Moving Average: Alpha = 0.3 for smoothing erratic GPS jumps
        newSpeed = (0.3 * instantSpeed) + (0.7 * newSpeed);

        // Sanity constraints
        if (newSpeed > 120) newSpeed = 120; // Cap at 120 km/h
        if (newSpeed < 1) newSpeed = 1;     // Floor at 1 km/h to prevent infinite ETA
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationUpdate: new Date(),
        currentSpeedKmH: newSpeed
      }
    })

    // Fetch school settings for Geofencing
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['schoolLat', 'schoolLng', 'geofenceRadius'] } }
    })
    const schoolLat = parseFloat(settings.find(s => s.key === 'schoolLat')?.value || '3.1390')
    const schoolLng = parseFloat(settings.find(s => s.key === 'schoolLng')?.value || '101.6869')
    const geofenceRadiusKm = parseFloat(settings.find(s => s.key === 'geofenceRadius')?.value || '500') / 1000

    const distanceKm = calculateDistance(latitude, longitude, schoolLat, schoolLng);
    const isNear = distanceKm <= geofenceRadiusKm;
    const etaMins = Math.round((distanceKm / newSpeed) * 60);

    // Publish to Redis for real-time SSE
    try {
      await redisPublisher.publish('location_updates', JSON.stringify({
        id: user.id,
        lastLatitude: latitude,
        lastLongitude: longitude,
        currentSpeedKmH: newSpeed,
        lastLocationUpdate: new Date().toISOString(),
        distanceKm,
        etaMins,
        isNear
      }));
    } catch (err) {
      console.error('Failed to publish location update to Redis', err);
    }

    // ── Night Bus / Late-Night Alert ────────────────────────────────────
    const hour = new Date().getHours()
    if (hour >= 19 || hour < 6) {
      // Curfew window: 7 PM to 6 AM — fire warning to admins
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(a => ({
            userId: a.id,
            title: '🌙 Night Bus Alert',
            body: `Driver ${existingUser?.name || user.id} is broadcasting GPS at ${new Date().toLocaleTimeString()} during curfew hours.`,
            type: 'WARNING',
          }))
        }).catch(() => {}) // Silent fail — don't block location update
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch school settings for Geofencing
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['schoolLat', 'schoolLng', 'geofenceRadius'] } }
    })

    // Default to Kuala Lumpur if school coordinates not configured
    const schoolLat = parseFloat(settings.find((s: { key: string; value: string }) => s.key === 'schoolLat')?.value || '34.0522')
    const schoolLng = parseFloat(settings.find((s: { key: string; value: string }) => s.key === 'schoolLng')?.value || '-118.2437')
    const geofenceRadiusKm = parseFloat(settings.find((s: { key: string; value: string }) => s.key === 'geofenceRadius')?.value || '500') / 1000 // default 500m

    // Active trips drive who we should be tracking — this lets buses on
    // hardware GPS (Wialon/Katsana) show up even if the driver's phone
    // never sent a location update (previously this endpoint only ever
    // looked at User.lastLatitude, so hardware-tracked buses never appeared).
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const activeTrips = await prisma.trip.findMany({
      where: { status: { not: 'TRIP_COMPLETED' }, date: { gte: oneDayAgo } },
      select: {
        driverId: true,
        busId: true,
        driver: { select: { id: true, name: true, phone: true } },
      },
    })

    // Dedupe by driver (a driver should only have one active trip at a time)
    const byDriver = new Map<string, { driverId: string; busId: string | null; name: string; phone: string | null }>()
    for (const t of activeTrips) {
      if (!byDriver.has(t.driverId)) {
        byDriver.set(t.driverId, { driverId: t.driverId, busId: t.busId, name: t.driver.name, phone: t.driver.phone })
      }
    }

    const driversWithGeo = await Promise.all(
      Array.from(byDriver.values()).map(async (entry) => {
        const loc = entry.busId ? await trackingService.getLiveLocation(entry.busId, entry.driverId) : null

        let isNear = false
        let distanceKm: number | null = null
        let etaMins: number | null = null
        if (loc) {
          distanceKm = calculateDistance(loc.lat, loc.lng, schoolLat, schoolLng)
          isNear = distanceKm <= geofenceRadiusKm
          const speed = loc.speed_kmh || 30.0
          etaMins = Math.round((distanceKm / speed) * 60)
        }

        return {
          id: entry.driverId,
          name: entry.name,
          phone: entry.phone,
          lastLatitude: loc?.lat ?? null,
          lastLongitude: loc?.lng ?? null,
          currentSpeedKmH: loc?.speed_kmh ?? null,
          lastLocationUpdate: loc?.timestamp ?? null,
          source: loc?.source ?? null,
          distanceKm,
          etaMins,
          isNear,
        }
      })
    )

    return NextResponse.json({ drivers: driversWithGeo })
  } catch (error) {
    console.error('Error fetching driver locations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
