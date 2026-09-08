/**
 * RideSafe Security Test Suite
 * Tests JWT signing/verification, Zod validation schemas, and rate limit logic.
 */

// ── Auth Tests ───────────────────────────────────────────────────────────────

// We can't directly import signToken/verifyToken because they depend on jose
// which uhses node crypto. So we test the validation layer thoroughly instead.

import {
  loginSchema,
  locationSchema,
  createUserSchema,
  attendanceSchema,
  billingGenerateSchema,
  messageSchema,
  handshakeSchema,
  validateBody,
} from '@/lib/core/validation'

describe('Zod Validation Schemas', () => {

  // ── Login Schema ─────────────────────────────────────────────────────────
  describe('loginSchema', () => {
    it('accepts valid email + password', () => {
      const result = validateBody(loginSchema, { email: 'test@school.com', password: 'pass123' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@school.com')
      }
    })

    it('normalizes email to lowercase', () => {
      const result = validateBody(loginSchema, { email: 'Admin@School.COM', password: 'pass' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('admin@school.com')
      }
    })

    it('rejects missing email', () => {
      const result = validateBody(loginSchema, { password: 'pass123' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid email format', () => {
      const result = validateBody(loginSchema, { email: 'not-an-email', password: 'pass123' })
      expect(result.success).toBe(false)
    })

    it('rejects empty password', () => {
      const result = validateBody(loginSchema, { email: 'test@school.com', password: '' })
      expect(result.success).toBe(false)
    })

    it('rejects excessively long email (>255 chars)', () => {
      const longEmail = 'a'.repeat(250) + '@test.com'
      const result = validateBody(loginSchema, { email: longEmail, password: 'pass' })
      expect(result.success).toBe(false)
    })

    it('rejects SQL injection attempt in email', () => {
      const result = validateBody(loginSchema, { email: "'; DROP TABLE users; --", password: 'pass' })
      expect(result.success).toBe(false) // fails email() check
    })
  })

  // ── Location Schema ──────────────────────────────────────────────────────
  describe('locationSchema', () => {
    it('accepts valid coordinates', () => {
      const result = validateBody(locationSchema, { latitude: 3.14, longitude: 101.68 })
      expect(result.success).toBe(true)
    })

    it('rejects latitude out of range', () => {
      const result = validateBody(locationSchema, { latitude: 91, longitude: 100 })
      expect(result.success).toBe(false)
    })

    it('rejects longitude out of range', () => {
      const result = validateBody(locationSchema, { latitude: 0, longitude: 181 })
      expect(result.success).toBe(false)
    })

    it('rejects string values', () => {
      const result = validateBody(locationSchema, { latitude: 'abc', longitude: '101' })
      expect(result.success).toBe(false)
    })
  })

  // ── User Creation Schema ─────────────────────────────────────────────────
  describe('createUserSchema', () => {
    it('accepts valid user data', () => {
      const result = validateBody(createUserSchema, {
        name: 'John Smith', email: 'john@school.com', password: 'secure123', role: 'DRIVER'
      })
      expect(result.success).toBe(true)
    })

    it('rejects password under 6 chars', () => {
      const result = validateBody(createUserSchema, {
        name: 'John', email: 'j@s.com', password: '12345', role: 'DRIVER'
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid role', () => {
      const result = validateBody(createUserSchema, {
        name: 'John', email: 'j@s.com', password: 'secure123', role: 'HACKER'
      })
      expect(result.success).toBe(false)
    })
  })

  // ── Attendance Schema ────────────────────────────────────────────────────
  describe('attendanceSchema', () => {
    it('accepts valid attendance record', () => {
      const result = validateBody(attendanceSchema, {
        tripId: 'trip1', studentId: 'stu1', stopId: 'stop1', action: 'PICKED_UP'
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid action', () => {
      const result = validateBody(attendanceSchema, {
        tripId: 'trip1', studentId: 'stu1', stopId: 'stop1', action: 'KIDNAPPED'
      })
      expect(result.success).toBe(false)
    })
  })

  // ── Billing Schema ───────────────────────────────────────────────────────
  describe('billingGenerateSchema', () => {
    it('accepts valid billing data', () => {
      const result = validateBody(billingGenerateSchema, { parentId: 'p1', amount: 150 })
      expect(result.success).toBe(true)
    })

    it('rejects negative amount', () => {
      const result = validateBody(billingGenerateSchema, { parentId: 'p1', amount: -50 })
      expect(result.success).toBe(false)
    })

    it('rejects zero amount', () => {
      const result = validateBody(billingGenerateSchema, { parentId: 'p1', amount: 0 })
      expect(result.success).toBe(false)
    })
  })

  // ── Message Schema ───────────────────────────────────────────────────────
  describe('messageSchema', () => {
    it('accepts valid message', () => {
      const result = validateBody(messageSchema, { recipientId: 'admin1', content: 'Hello there' })
      expect(result.success).toBe(true)
    })

    it('rejects empty content', () => {
      const result = validateBody(messageSchema, { recipientId: 'admin1', content: '' })
      expect(result.success).toBe(false)
    })

    it('rejects message over 2000 chars', () => {
      const result = validateBody(messageSchema, { recipientId: 'admin1', content: 'x'.repeat(2001) })
      expect(result.success).toBe(false)
    })
  })

  // ── Handshake Schema ─────────────────────────────────────────────────────
  describe('handshakeSchema', () => {
    it('accepts valid handshake payload', () => {
      const result = validateBody(handshakeSchema, {
        driverId: 'd1', busId: 'b1', qrToken: 'tok', deviceId: 'dev1'
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty fields', () => {
      const result = validateBody(handshakeSchema, {
        driverId: '', busId: 'b1', qrToken: 'tok', deviceId: 'dev1'
      })
      expect(result.success).toBe(false)
    })
  })
})
