import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'
import bcrypt from 'bcryptjs'
import { logAudit } from '@/lib/services/auditService'

export const dynamic = 'force-dynamic'

const VALID_ROLES = ['ADMIN', 'DRIVER', 'PARENT', 'SCHOOL_ADMIN', 'SUPER_ADMIN']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getUserFromSession()
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { name, email, phone, role, organizationId, password } = await req.json()
    const updates: Record<string, unknown> = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
        return NextResponse.json({ error: 'Name must be between 2 and 100 characters' }, { status: 400 })
      }
      updates.name = name.trim()
    }

    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
      }
      const normalized = email.toLowerCase().trim()
      if (normalized !== existing.email) {
        const dupe = await prisma.user.findUnique({ where: { email: normalized } })
        if (dupe) {
          return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
        }
      }
      updates.email = normalized
    }

    if (phone !== undefined) {
      if (phone && !/^[+0-9\s()\-]{7,20}$/.test(phone)) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
      }
      updates.phone = phone?.trim() || null
    }

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      if ((role === 'SUPER_ADMIN' || existing.role === 'SUPER_ADMIN') && auth.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Only a Super Admin can assign or change this role' }, { status: 403 })
      }
      updates.role = role
    }

    if (organizationId !== undefined) {
      if (organizationId) {
        const org = await prisma.organization.findUnique({ where: { id: organizationId } })
        if (!org) {
          return NextResponse.json({ error: 'Organisation not found' }, { status: 400 })
        }
        updates.organizationId = organizationId
      } else {
        updates.organizationId = null
      }
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }
      updates.password = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updates,
      select: { id: true, name: true, email: true, role: true, phone: true, organizationId: true }
    })

    logAudit({ userId: auth.id, action: 'UPDATE_USER', target: 'User', targetId: id, details: updates })
    return NextResponse.json({ user })
  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getUserFromSession()
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (id === auth.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (existing.role === 'SUPER_ADMIN' && auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only a Super Admin can delete another Super Admin' }, { status: 403 })
    }

    await prisma.user.delete({ where: { id } })
    logAudit({ userId: auth.id, action: 'DELETE_USER', target: 'User', targetId: id, details: { name: existing.name, email: existing.email } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code
    if (code === 'P2003') {
      return NextResponse.json({
        error: 'Cannot delete this user — they have associated trips, buses, students, or payment records. Reassign or remove those first.'
      }, { status: 409 })
    }
    console.error('User delete error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
