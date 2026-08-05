import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const routeId = searchParams.get('routeId')

        const whereClause = routeId ? { routeId } : {}
        const stops = await prisma.stop.findMany({
            where: whereClause,
            orderBy: { order: 'asc' }
        })

        return NextResponse.json({ stops })
    } catch (error) {
        console.error('Stops GET Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user || user.role === 'PARENT' || user.role === 'DRIVER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const data = await request.json()
        if (!data.routeId || !data.name || data.latitude === undefined || data.longitude === undefined || data.order === undefined) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        const stop = await prisma.stop.create({
            data: {
                routeId: data.routeId,
                name: data.name,
                latitude: data.latitude,
                longitude: data.longitude,
                order: data.order
            }
        })

        return NextResponse.json({ stop })
    } catch (error) {
        console.error('Stops POST Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
