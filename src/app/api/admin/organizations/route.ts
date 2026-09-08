import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'
import { logAudit } from '@/lib/services/auditService'

export const dynamic = 'force-dynamic'

const PHONE_RE = /^[+0-9\s()-]{7,20}$/

function validateOrgFields(name: string | undefined, address: string | undefined, phone: string | undefined): string | null {
  if (name !== undefined && (!name || name.trim().length < 2)) {
    return 'Organization name must be at least 2 characters'
  }
  if (address !== undefined && address && !address.trim()) {
    return 'Address cannot be only spaces'
  }
  if (phone !== undefined && phone) {
    if (!phone.trim()) return 'Phone number cannot be only spaces'
    if (!PHONE_RE.test(phone.trim())) return 'Enter a valid phone number'
  }
  return null
}

export async function GET() {
  try {
    const auth = await getUserFromSession()
    if (!auth || auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { ensureSuperAdminSchema } = await import('@/lib/db/ensureSchema')
    await ensureSuperAdminSchema()
    const orgs = await prisma.organization.findMany({
      include: {
        _count: { select: { users: true, students: true, buses: true, routes: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ organizations: orgs })
  } catch (error) {
    console.error('Org list error:', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserFromSession()
    if (!auth || auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { name, address, phone, subscriptionTier, maxBuses, maxStudents, maxUsers } = await req.json()
    const validationError = validateOrgFields(name, address, phone)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    // Check for duplicate name
    const existing = await prisma.organization.findFirst({ where: { name: { equals: name.trim(), mode: 'insensitive' } } })
    if (existing) {
      return NextResponse.json({ error: 'An organisation with this name already exists' }, { status: 409 })
    }
    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        subscriptionTier: subscriptionTier || 'FREE',
        maxBuses: maxBuses ? Number(maxBuses) : 5,
        maxStudents: maxStudents ? Number(maxStudents) : 100,
        maxUsers: maxUsers ? Number(maxUsers) : 20,
      },
      include: { _count: { select: { users: true, students: true, buses: true, routes: true } } }
    })
    logAudit({ userId: auth.id, action: 'CREATE_ORG', target: 'Organization', targetId: org.id, details: { name: org.name, subscriptionTier: org.subscriptionTier } })
    return NextResponse.json({ organization: org })
  } catch (error) {
    console.error('Org create error:', error)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getUserFromSession()
    if (!auth || auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id, name, address, phone, isActive, subscriptionTier, maxBuses, maxStudents, maxUsers } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
    const validationError = validateOrgFields(name, address, phone)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name.trim()
    if (address !== undefined) updates.address = address?.trim() || null
    if (phone !== undefined) updates.phone = phone?.trim() || null
    if (isActive !== undefined) updates.isActive = Boolean(isActive)
    if (subscriptionTier !== undefined) updates.subscriptionTier = subscriptionTier
    if (maxBuses !== undefined) updates.maxBuses = Number(maxBuses)
    if (maxStudents !== undefined) updates.maxStudents = Number(maxStudents)
    if (maxUsers !== undefined) updates.maxUsers = Number(maxUsers)

    const org = await prisma.organization.update({
      where: { id },
      data: updates,
      include: { _count: { select: { users: true, students: true, buses: true, routes: true } } }
    })
    logAudit({ userId: auth.id, action: 'UPDATE_ORG', target: 'Organization', targetId: id, details: updates })
    return NextResponse.json({ organization: org })
  } catch (error) {
    console.error('Org update error:', error)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getUserFromSession()
    if (!auth || auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
    await prisma.organization.delete({ where: { id } })
    logAudit({ userId: auth.id, action: 'DELETE_ORG', target: 'Organization', targetId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Org delete error:', error)
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
  }
}
