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
    const existing = await prisma.bus.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Bus not found' }, { status: 404 })
    }

    const { plateNumber, capacity, status, driverId, routeId, wialonUnitId, katsanaVehicleId } = await req.json()
    const updates: Record<string, unknown> = {}

    if (plateNumber !== undefined) {
      if (!plateNumber || !String(plateNumber).trim()) {
        return NextResponse.json({ error: 'Plate number is required' }, { status: 400 })
      }
      updates.plateNumber = String(plateNumber).trim()
    }
    if (capacity !== undefined) {
      const cap = parseInt(capacity)
      if (isNaN(cap) || cap < 1 || cap > 200) {
        return NextResponse.json({ error: 'Capacity must be a number between 1 and 200' }, { status: 400 })
      }
      updates.capacity = cap
    }
    if (status !== undefined) updates.status = status
    if (driverId !== undefined) updates.driverId = driverId || null
    if (routeId !== undefined) updates.routeId = routeId || null
    if (wialonUnitId !== undefined) updates.wialonUnitId = wialonUnitId || null
    if (katsanaVehicleId !== undefined) updates.katsanaVehicleId = katsanaVehicleId || null

    const bus = await prisma.bus.update({
      where: { id },
      data: updates,
      include: { driver: { select: { id: true, name: true, phone: true } }, route: { select: { id: true, name: true } } }
    })

    return NextResponse.json({ bus })
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code
    if (code === 'P2002') {
      return NextResponse.json({ error: 'A bus with this plate number already exists' }, { status: 409 })
    }
    console.error('Bus update error:', error)
    return NextResponse.json({ error: 'Failed to update bus' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getUserFromSession()
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.bus.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Bus not found' }, { status: 404 })
    }

    await prisma.bus.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code
    if (code === 'P2003') {
      return NextResponse.json({
        error: 'Cannot delete this bus — it has associated trips or maintenance records. Remove those first.'
      }, { status: 409 })
    }
    console.error('Bus delete error:', error)
    return NextResponse.json({ error: 'Failed to delete bus' }, { status: 500 })
  }
}
