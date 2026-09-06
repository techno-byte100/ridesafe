/**
 * TrackingService — GPS location orchestration.
 *
 * 3-source priority chain:
 *   1. Wialon  — dedicated GPS hardware tracker (most accurate)
 *   2. Katsana — Malaysian fleet GPS hardware tracker (second hardware option)
 *   3. Mobile  — driver's phone GPS broadcast (always available as fallback)
 *
 * Architecture: Client App → RideSafe Backend → GPS Provider
 * Neither Wialon nor Katsana are called directly from the browser.
 */

import { getWialonAdapter }  from '@/lib/core/wialon'
import { getKatsanaAdapter } from '@/lib/adapters/katsana'
import prisma from '../db/prisma';

export type TrackingSource = 'WIALON' | 'KATSANA' | 'MOBILE'

export interface LiveLocation {
  lat:       number
  lng:       number
  speed_kmh: number
  heading:   number | null
  altitude:  number | null
  ignition:  boolean | null
  timestamp: string
  source:    TrackingSource
}

export class TrackingService {

  async getLiveLocation(busId: string, driverId: string): Promise<LiveLocation | null> {

    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      select: {
        wialonUnitId:     true,
        katsanaVehicleId: true,
      } as any,
    }) as any

    // ── 1. Wialon ────────────────────────────────────────────────────────────
    if (bus?.wialonUnitId) {
      try {
        const wialon = getWialonAdapter()
        if (!wialon.isAuthenticated()) await wialon.authenticate()

        const pos = await wialon.getUnitPosition(bus.wialonUnitId)
        if (pos) {
          return {
            lat:       pos.lat,
            lng:       pos.lng,
            speed_kmh: pos.speed,
            heading:   pos.heading,
            altitude:  pos.altitude,
            ignition:  pos.ignition,
            timestamp: new Date(pos.timestamp * 1000).toISOString(),
            source:    'WIALON',
          }
        }
      } catch (err) {
        console.warn('[TrackingService] Wialon unavailable for bus', busId, (err as Error).message)
      }
    }

    // ── 2. Katsana ───────────────────────────────────────────────────────────
    if (bus?.katsanaVehicleId) {
      try {
        const katsana = getKatsanaAdapter()
        if (!katsana.isAuthenticated()) await katsana.authenticate()

        const pos = await katsana.fetchLocation(bus.katsanaVehicleId)
        if (pos) {
          return {
            lat:       pos.lat,
            lng:       pos.lng,
            speed_kmh: pos.speed,
            heading:   pos.heading,
            altitude:  pos.altitude,
            ignition:  pos.ignition,
            timestamp: pos.timestamp,
            source:    'KATSANA',
          }
        }
      } catch (err) {
        console.warn('[TrackingService] Katsana unavailable for bus', busId, (err as Error).message)
      }
    }

    // ── 3. Mobile GPS fallback ───────────────────────────────────────────────
    console.warn(`[TrackingService] Both hardware trackers unavailable for bus ${busId} — using Mobile GPS`)

    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      select: {
        lastLatitude:       true,
        lastLongitude:      true,
        currentSpeedKmH:    true,
        lastLocationUpdate: true,
      },
    })

    if (driver?.lastLatitude && driver?.lastLongitude) {
      return {
        lat:       driver.lastLatitude,
        lng:       driver.lastLongitude,
        speed_kmh: driver.currentSpeedKmH || 0,
        heading:   null,
        altitude:  null,
        ignition:  null,
        timestamp: driver.lastLocationUpdate?.toISOString() ?? new Date().toISOString(),
        source:    'MOBILE',
      }
    }

    return null
  }
}

export const trackingService = new TrackingService()
