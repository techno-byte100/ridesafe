/**
 * Katsana Fleet Tracking Adapter
 *
 * Katsana is a Malaysian fleet management platform (katsana.com).
 * Auth:  OAuth2 client-credentials — POST /oauth/token → access_token (Bearer)
 * Host:  https://api.katsana.com
 * Docs:  https://developer.katsana.com
 *
 * Environment variables required:
 *   KATSANA_CLIENT_ID      – OAuth2 client ID
 *   KATSANA_CLIENT_SECRET  – OAuth2 client secret
 */

const BASE_URL = 'https://api.katsana.com'
const ACCEPT   = 'application/vnd.KATSANA.v1+json'

export interface KatsanaPosition {
  vehicleId:  string
  lat:        number
  lng:        number
  speed:      number    // km/h — Katsana returns km/h natively (NOT knots)
  heading:    number    // degrees 0-360
  altitude:   number
  ignition:   boolean
  satellites: number
  timestamp:  string    // ISO string
}

export interface KatsanaVehicle {
  id:           number
  user_id:      number
  plate_number: string
  description:  string
  current?: {
    latitude:   number
    longitude:  number
    speed:      number
    heading:    number
    altitude:   number
    satellites: number
    ignition:   number | boolean
    tracked_at: string
  }
}

export class KatsanaAdapter {
  private readonly clientId:     string
  private readonly clientSecret: string
  private accessToken:  string | null = null
  private tokenExpiry:  number | null = null   // Unix ms

  constructor(
    clientId     = process.env.KATSANA_CLIENT_ID     || '',
    clientSecret = process.env.KATSANA_CLIENT_SECRET || '',
  ) {
    this.clientId     = clientId
    this.clientSecret = clientSecret
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret)
  }

  isAuthenticated(): boolean {
    return !!(this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60_000)
  }

  async authenticate(): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('[Katsana] KATSANA_CLIENT_ID / KATSANA_CLIENT_SECRET not set')
      return false
    }

    try {
      const res = await fetch(`${BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: ACCEPT },
        body: JSON.stringify({
          grant_type:    'client_credentials',
          client_id:     this.clientId,
          client_secret: this.clientSecret,
          scope:         '*',
        }),
      })

      if (!res.ok) {
        console.error('[Katsana] Auth failed:', res.status, await res.text())
        return false
      }

      const data = await res.json()
      this.accessToken = data.access_token
      // expires_in is in seconds; store as absolute ms timestamp
      this.tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000
      console.log('[Katsana] Authenticated. Token expires in', data.expires_in, 's')
      return true
    } catch (err) {
      console.error('[Katsana] Auth error:', err)
      return false
    }
  }

  private async ensureAuth(): Promise<boolean> {
    if (this.isAuthenticated()) return true
    return this.authenticate()
  }

  // ── Core GET helper ─────────────────────────────────────────────────────────

  private async get(path: string): Promise<any> {
    const ok = await this.ensureAuth()
    if (!ok) throw new Error('[Katsana] Not authenticated')

    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Accept:        ACCEPT,
        Authorization: `Bearer ${this.accessToken}`,
      },
    })

    if (res.status === 401) {
      // Force re-auth once on 401
      this.accessToken = null
      this.tokenExpiry = null
      const retried = await this.authenticate()
      if (!retried) throw new Error('[Katsana] Re-authentication failed')
      const retry = await fetch(`${BASE_URL}${path}`, {
        headers: { Accept: ACCEPT, Authorization: `Bearer ${this.accessToken}` },
      })
      if (!retry.ok) throw new Error(`[Katsana] ${path} returned ${retry.status}`)
      return retry.json()
    }

    if (!res.ok) throw new Error(`[Katsana] ${path} returned ${res.status}`)
    return res.json()
  }

  // ── Vehicle List ────────────────────────────────────────────────────────────

  async listVehicles(): Promise<KatsanaVehicle[]> {
    try {
      const data = await this.get('/v1/vehicles')
      return Array.isArray(data) ? data : (data.data ?? [])
    } catch (err) {
      console.error('[Katsana] listVehicles error:', err)
      return []
    }
  }

  // ── Single Vehicle Location ─────────────────────────────────────────────────

  async fetchLocation(vehicleId: string): Promise<KatsanaPosition | null> {
    try {
      const data = await this.get(`/v1/vehicles/${vehicleId}/location`)
      const loc = data.current ?? data

      if (!loc?.latitude || !loc?.longitude) return null

      return {
        vehicleId,
        lat:        parseFloat(loc.latitude),
        lng:        parseFloat(loc.longitude),
        speed:      parseFloat(loc.speed ?? 0),       // Already km/h — no conversion needed
        heading:    parseFloat(loc.heading ?? 0),
        altitude:   parseFloat(loc.altitude ?? 0),
        ignition:   loc.ignition === 1 || loc.ignition === true,
        satellites: parseInt(String(loc.satellites ?? 0)),
        timestamp:  loc.tracked_at ?? new Date().toISOString(),
      }
    } catch (err) {
      console.error(`[Katsana] fetchLocation(${vehicleId}) error:`, err)
      return null
    }
  }

  // ── All Vehicles (positions embedded in list response) ──────────────────────

  async fetchAllLocations(): Promise<KatsanaPosition[]> {
    try {
      const vehicles = await this.listVehicles()
      const results: KatsanaPosition[] = []

      for (const v of vehicles) {
        const loc = v.current
        if (!loc?.latitude || !loc?.longitude) continue
        results.push({
          vehicleId:  String(v.id),
          lat:        parseFloat(String(loc.latitude)),
          lng:        parseFloat(String(loc.longitude)),
          speed:      parseFloat(String(loc.speed ?? 0)),
          heading:    parseFloat(String(loc.heading ?? 0)),
          altitude:   parseFloat(String(loc.altitude ?? 0)),
          ignition:   loc.ignition === 1 || loc.ignition === true,
          satellites: parseInt(String(loc.satellites ?? 0)),
          timestamp:  loc.tracked_at ?? new Date().toISOString(),
        })
      }

      return results
    } catch (err) {
      console.error('[Katsana] fetchAllLocations error:', err)
      return []
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _katsanaAdapter: KatsanaAdapter | null = null

export function getKatsanaAdapter(): KatsanaAdapter {
  if (!_katsanaAdapter) {
    _katsanaAdapter = new KatsanaAdapter()
  }
  return _katsanaAdapter
}

export const katsanaAdapter = getKatsanaAdapter()
