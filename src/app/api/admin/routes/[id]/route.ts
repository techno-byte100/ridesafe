import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getUserFromSession()
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.route.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    const { name, morningTime, afternoonTime } = await req.json()
    const updates: Record<string, unknown> = {}

    if (name !== undefined) {
      if (!name || !String(name).trim()) {
        return NextResponse.json({ error: 'Route name is required' }, { status: 400 })
      }
      updates.name = String(name).trim()
    }
    if (morningTime !== undefined) updates.morningTime = morningTime || null
    if (afternoonTime !== undefined) updates.afternoonTime = afternoonTime || null

    const route = await prisma.route.update({
      where: { id },
      data: updates,
      include: { _count: { select: { students: true, buses: true } } }
    })

    return NextResponse.json({ route })
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code
    if (code === 'P2002') {
      return NextResponse.json({ error: 'A route with this name already exists' }, { status: 409 })
    }
    console.error('Route update error:', error)
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getUserFromSession()
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.route.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    await prisma.stop.deleteMany({ where: { routeId: id } })
    await prisma.route.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code
    if (code === 'P2003') {
      return NextResponse.json({
        error: 'Cannot delete this route — it still has buses, students, or trips assigned. Reassign or remove those first.'
      }, { status: 409 })
    }
    console.error('Route delete error:', error)
    return NextResponse.json({ error: 'Failed to delete route' }, { status: 500 })
  }
}
