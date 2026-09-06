/**
 * Wialon GPS Adapter — corrected per official Wialon Hosting API docs.
 *
 * Key rules from the official documentation:
 *  - Only POST method with Content-Type: application/x-www-form-urlencoded
 *  - Every request needs sid (session ID), svc (service), params (JSON)
 *  - Default session duration: 5 minutes of inactivity → keep alive with avl_evts every 2 s
 *  - All numbers in decimal (not HEX)
 *  - API host: https://hst-api.wialon.com/wialon/ajax.html
 */

import { redis, redisPublisher } from '@/lib/db/redis'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WialonPosition {
  unitId: string
  lat: number
  lng: number
  speed: number       // km/h
  heading: number     // degrees 0-360
  altitude: number
  timestamp: number   // Unix timestamp (seconds)
  ignition: boolean
}

export interface WialonUnit {
  id: number
  name: string
  pos?: {
    x: number   // longitude
    y: number   // latitude
    z: number   // altitude
    s: number   // speed km/h
    c: number   // course/heading
    t: number   // unix timestamp
  }
  prms?: Record<string, { v: number | string }>
}

export interface WialonGeofenceEvent {
  unitId: string
  zoneId: string
  zoneName: string
  eventType: 'ENTER' | 'EXIT'
  lat: number
  lng: number
  timestamp: number
}

// ─── Redis Channel Helpers ────────────────────────────────────────────────────

export function gpsChannel(organisationId: string, vehicleId: string): string {
  return `gps:${organisationId}:${vehicleId}`
}

export function geofenceChannel(organisationId: string): string {
  return `geofence:${organisationId}`
}

// ─── Wialon Adapter ───────────────────────────────────────────────────────────

export class WialonAdapter {
  private readonly apiUrl: string
  private readonly token: string

  private sessionId: string | null = null
  private keepAliveTimer: NodeJS.Timeout | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private retryCount = 0

  private readonly MAX_RETRIES = 5
  // PDF: send avl_evts every 2 seconds to keep session alive
  private readonly KEEPALIVE_INTERVAL_MS = 2000
  // Position poll via search_items every 5 seconds
  private readonly POLL_INTERVAL_MS = 5000

  // Map: wialonUnitId (string) → { organisationId, vehicleId }
  private unitMap: Map<string, { organisationId: string; vehicleId: string }> = new Map()

  constructor(
    token: string,
    apiUrl = 'https://hst-api.wialon.com/wialon/ajax.html',
  ) {
    this.token = token
    this.apiUrl = apiUrl
  }

  // ─── Core POST helper ───────────────────────────────────────────────────────
  // PDF: "Only the POST method is used for the requests."
  // PDF: "It is necessary to indicate Content-Type:application/x-www-form-urlencoded"
  private async wialonPost(
    svc: string,
    params: Record<string, unknown>,
    requiresSid = true,
  ): Promise<any> {
    const body = new URLSearchParams({ svc, params: JSON.stringify(params) })

    // PDF: "The session identifier (sid) is a required parameter for all requests.
    //       The exceptions are the requests from the token/login section."
    if (requiresSid && this.sessionId) {
      body.set('sid', this.sessionId)
    }

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    const data = await res.json()
    return data
  }

  // ─── Authentication ─────────────────────────────────────────────────────────

  async authenticate(): Promise<boolean> {
    try {
      // PDF: "svc=token/login" does not require an existing sid
      const data = await this.wialonPost(
        'token/login',
        { token: this.token },
        false, // no sid needed for login
      )

      if (data.error) {
        console.error('[Wialon] Auth failed. Error code:', data.error)
        return false
      }

      this.sessionId = data.eid
      this.retryCount = 0
      console.log('[Wialon] Authenticated. Session:', this.sessionId)
      return true
    } catch (err) {
      console.error('[Wialon] Auth error:', err)
      return false
    }
  }

  isAuthenticated(): boolean {
    return this.sessionId !== null
  }

  // ─── Session Keep-Alive ─────────────────────────────────────────────────────
  // PDF: "To maintain the session, you should use the constant sending of
  //       the avl_evts request, for example, every 2 seconds."
  private startKeepAlive() {
    this.stopKeepAlive()
    this.keepAliveTimer = setInterval(async () => {
      if (!this.sessionId) return
      try {
        const data = await this.wialonPost('avl_evts', {})
        if (data?.error === 1) {
          // Error 1 = invalid session — re-authenticate
          console.warn('[Wialon] Session expired during keep-alive. Re-authenticating...')
          await this.retryAuthentication()
        }
      } catch {
        // Silent — network blip, next tick will retry
      }
    }, this.KEEPALIVE_INTERVAL_MS)
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
  }

  // ─── Unit Registration ──────────────────────────────────────────────────────

  registerUnit(wialonUnitId: string, organisationId: string, vehicleId: string) {
    this.unitMap.set(wialonUnitId, { organisationId, vehicleId })
  }

  unregisterUnit(wialonUnitId: string) {
    this.unitMap.delete(wialonUnitId)
  }

  // Auto-discover all units accessible to the token and return them
  async loadAllUnits(): Promise<WialonUnit[]> {
    if (!this.sessionId) return []
    try {
      const data = await this.wialonPost('core/search_items', {
        spec: {
          itemsType: 'avl_unit',
          propName: 'sys_name',
          propValueMask: '*',
          sortType: 'sys_name',
        },
        force: 1,
        // flags: decimal, not HEX (PDF note)
        // 1 = base info, 1024 (0x400) = last message with position
        flags: 1025,
        from: 0,
        to: 0,
      })

      if (data?.error) {
        console.error('[Wialon] loadAllUnits error:', data.error)
        return []
      }

      return (data?.items ?? []) as WialonUnit[]
    } catch (err) {
      console.error('[Wialon] loadAllUnits failed:', err)
      return []
    }
  }

  // Subscribe units to real-time data updates via core/update_data_flags
  // This sets up the Wialon server to track changes for the specified units.
  // PDF: "core/update_data_flags — Load realtime data"
  private async subscribeUnits(unitIds: number[]): Promise<void> {
    if (!this.sessionId || unitIds.length === 0) return
    try {
      await this.wialonPost('core/update_data_flags', {
        spec: unitIds.map(id => ({
          type: 'type',
          data: {
            id,
            // flags: 1 (base) + 1024 (last position message) — decimal per PDF
            flags: 1025,
            mode: 0,
          },
          uid: id,
        })),
      })
    } catch (err) {
      console.error('[Wialon] subscribeUnits error:', err)
    }
  }

  // ─── Position Polling ───────────────────────────────────────────────────────

  async startPolling() {
    if (!this.sessionId) {
      const ok = await this.authenticate()
      if (!ok) throw new Error('[Wialon] Authentication failed — cannot start polling')
    }

    // Subscribe all registered units for real-time data
    const unitIds = Array.from(this.unitMap.keys()).map(Number).filter(n => !isNaN(n))
    if (unitIds.length > 0) {
      await this.subscribeUnits(unitIds)
    }

    // Start keep-alive (avl_evts every 2s per PDF)
    this.startKeepAlive()

    // Start position poll every 5s
    this.pollTimer = setInterval(async () => {
      await this.fetchPositions()
    }, this.POLL_INTERVAL_MS)

    console.log('[Wialon] Polling started with keep-alive')
  }

  stopPolling() {
    this.stopKeepAlive()
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.sessionId = null
    console.log('[Wialon] Polling stopped')
  }

  private async fetchPositions() {
    const unitIds = Array.from(this.unitMap.keys())
    if (unitIds.length === 0) return

    try {
      // PDF: "core/search_items — Get units"
      const data = await this.wialonPost('core/search_items', {
        spec: {
          itemsType: 'avl_unit',
          propName: 'sys_id',
          // Mask supports comma-separated IDs or wildcard
          propValueMask: unitIds.join(','),
          sortType: 'sys_id',
        },
        force: 1,
        flags: 1025, // decimal: 1 (base info) + 1024 (last message/position)
        from: 0,
        to: 0,
      })

      // Error code 1 = invalid session
      if (data?.error === 1) {
        console.warn('[Wialon] Session expired. Re-authenticating...')
        await this.retryAuthentication()
        return
      }

      const items: WialonUnit[] = data?.items ?? []

      for (const item of items) {
        const wialonUnitId = String(item.id)
        const mapping = this.unitMap.get(wialonUnitId)
        if (!mapping) continue

        // PDF: pos.x = longitude, pos.y = latitude, pos.s = speed, pos.c = course
        const pos = item.pos
        if (!pos) continue

        const position: WialonPosition = {
          unitId: wialonUnitId,
          lat: pos.y,
          lng: pos.x,
          speed: pos.s ?? 0,
          heading: pos.c ?? 0,
          altitude: pos.z ?? 0,
          timestamp: pos.t,
          ignition: !!(item.prms?.ign?.v),
        }

        await this.publishPosition(mapping.organisationId, mapping.vehicleId, position)
      }

      this.retryCount = 0
    } catch (err) {
      console.error('[Wialon] fetchPositions error:', err)
      await this.retryAuthentication()
    }
  }

  // ─── Publish to Redis ───────────────────────────────────────────────────────

  private async publishPosition(
    organisationId: string,
    vehicleId: string,
    position: WialonPosition,
  ) {
    const channel = gpsChannel(organisationId, vehicleId)
    const payload = JSON.stringify(position)

    await redisPublisher.publish(channel, payload)

    // Cache last known position for 30 minutes
    await redis.set(`gps:last:${vehicleId}`, payload, 'EX', 1800)
  }

  // ─── Retry Logic ────────────────────────────────────────────────────────────

  private async retryAuthentication() {
    if (this.retryCount >= this.MAX_RETRIES) {
      console.error('[Wialon] Max retries reached. Stopping polling.')
      this.stopPolling()
      return
    }

    this.retryCount++
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000)
    console.log(`[Wialon] Retry ${this.retryCount}/${this.MAX_RETRIES} in ${delay}ms`)

    await new Promise(r => setTimeout(r, delay))
    await this.authenticate()

    // Restart keep-alive after re-auth
    if (this.sessionId) this.startKeepAlive()
  }

  // ─── Last Known Position ────────────────────────────────────────────────────

  async getLastPosition(vehicleId: string): Promise<WialonPosition | null> {
    const raw = await redis.get(`gps:last:${vehicleId}`)
    if (!raw) return null
    return JSON.parse(raw) as WialonPosition
  }

  // ─── Direct unit position fetch (for on-demand queries) ─────────────────────

  async getUnitPosition(wialonUnitId: string): Promise<WialonPosition | null> {
    if (!this.sessionId) return null
    try {
      const data = await this.wialonPost('core/search_items', {
        spec: {
          itemsType: 'avl_unit',
          propName: 'sys_id',
          propValueMask: wialonUnitId,
          sortType: 'sys_id',
        },
        force: 1,
        flags: 1025,
        from: 0,
        to: 0,
      })

      const item: WialonUnit | undefined = data?.items?.[0]
      if (!item?.pos) return null

      return {
        unitId: wialonUnitId,
        lat: item.pos.y,
        lng: item.pos.x,
        speed: item.pos.s ?? 0,
        heading: item.pos.c ?? 0,
        altitude: item.pos.z ?? 0,
        timestamp: item.pos.t,
        ignition: !!(item.prms?.ign?.v),
      }
    } catch {
      return null
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _wialonAdapter: WialonAdapter | null = null

export function getWialonAdapter(): WialonAdapter {
  if (!_wialonAdapter) {
    const token = process.env.WIALON_TOKEN
    if (!token) throw new Error('WIALON_TOKEN environment variable is not set')
    _wialonAdapter = new WialonAdapter(token)
  }
  return _wialonAdapter
}
