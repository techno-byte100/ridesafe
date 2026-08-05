import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getUserFromSession()
    if (!auth || auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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
    const { name, address, phone } = await req.json()
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Organization name must be at least 2 characters' }, { status: 400 })
    }
    // Check for duplicate name
    const existing = await prisma.organization.findFirst({ where: { name: { equals: name.trim(), mode: 'insensitive' } } })
    if (existing) {
      return NextResponse.json({ error: 'An organisation with this name already exists' }, { status: 409 })
    }
    const org = await prisma.organization.create({
      data: { name: name.trim(), address: address?.trim() || null, phone: phone?.trim() || null },
      include: { _count: { select: { users: true, students: true, buses: true, routes: true } } }
    })
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
    const { id, name, address, phone, isActive } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
    if (name !== undefined && (!name || name.trim().length < 2)) {
      return NextResponse.json({ error: 'Organization name must be at least 2 characters' }, { status: 400 })
    }
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name.trim()
    if (address !== undefined) updates.address = address?.trim() || null
    if (phone !== undefined) updates.phone = phone?.trim() || null
    if (isActive !== undefined) updates.isActive = Boolean(isActive)

    const org = await prisma.organization.update({
      where: { id },
      data: updates,
      include: { _count: { select: { users: true, students: true, buses: true, routes: true } } }
    })
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
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Org delete error:', error)
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
  }
}
