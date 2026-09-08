import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { loginSchema, validateBody } from '@/lib/core/validation'
import { ensureSuperAdminSchema } from '@/lib/db/ensureSchema'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = validateBody(loginSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { email, password } = validation.data

    // Auto-sync Super Admin schema columns/tables on live DB if needed
    await ensureSuperAdminSchema()

    // Explicit select to avoid querying columns that might be pending on database
    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
      }
    })

    // If demo account doesn't exist yet on this database, auto-provision it with standard seed password
    if (!user && password === 'password123') {
      const DEMO_USERS: Record<string, { name: string; role: string }> = {
        'admin@ridesafe.com':       { name: 'Master Super Admin', role: 'SUPER_ADMIN' },
        'superadmin@ridesafe.com':  { name: 'Master Super Admin', role: 'SUPER_ADMIN' },
        'schooladmin@ridesafe.com': { name: 'Principal School Admin', role: 'SCHOOL_ADMIN' },
        'deskadmin@ridesafe.com':   { name: 'Desk Staff Admin', role: 'ADMIN' },
        'driver@ridesafe.com':      { name: 'John Driver', role: 'DRIVER' },
        'parent1@ridesafe.com':     { name: 'Alice Parent', role: 'PARENT' },
      }
      if (DEMO_USERS[email]) {
        const passwordHash = await bcrypt.hash('password123', 10)
        user = await prisma.user.create({
          data: {
            email,
            name: DEMO_USERS[email].name,
            role: DEMO_USERS[email].role,
            password: passwordHash,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            password: true,
          }
        })
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signToken({ id: user.id, role: user.role })

    // Update lastLoginAt safely (fire-and-forget, never throws)
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    }).catch(err => {
      console.warn('[Login] lastLoginAt update skipped:', err?.message)
    })

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/'
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
