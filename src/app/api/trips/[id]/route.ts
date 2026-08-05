import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id } = await params
        const data = await request.json()

        if (user.role === 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const trip = await prisma.trip.findUnique({ where: { id } })
        if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (user.role === 'DRIVER' && trip.driverId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const updated = await prisma.trip.update({
            where: { id },
            data: {
                ...(data.status && { status: data.status })
            }
        })

        return NextResponse.json({ trip: updated })
    } catch (error) {
        console.error('Trip PATCH Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
