import { z } from 'zod'

// ── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform(v => v.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
})

// ── Location ─────────────────────────────────────────────────────────────────
export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

// ── User Creation ────────────────────────────────────────────────────────────
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  email: z.string().email().max(255).transform(v => v.toLowerCase().trim()),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  phone: z.string().max(20).optional().default(''),
  role: z.enum(['ADMIN', 'DRIVER', 'PARENT', 'SCHOOL_ADMIN', 'SUPER_ADMIN']),
})

// ── Attendance ───────────────────────────────────────────────────────────────
export const attendanceSchema = z.object({
  tripId: z.string().min(1),
  studentId: z.string().min(1),
  stopId: z.string().min(1),
  action: z.enum(['PICKED_UP', 'DROPPED_OFF', 'ABSENT']),
})

// ── Billing ──────────────────────────────────────────────────────────────────
export const billingGenerateSchema = z.object({
  parentId: z.string().min(1),
  amount: z.number().positive().max(100000),
})

// ── Messages ─────────────────────────────────────────────────────────────────
export const messageSchema = z.object({
  recipientId: z.string().min(1),
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long').trim(),
})

// ── Tracking Handshake ───────────────────────────────────────────────────────
export const handshakeSchema = z.object({
  driverId: z.string().min(1),
  busId: z.string().min(1),
  qrToken: z.string().min(1),
  deviceId: z.string().min(1),
})

/**
 * Helper to validate request body against a Zod schema.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown):
  { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const message = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
  return { success: false, error: message }
}
