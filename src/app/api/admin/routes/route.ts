import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const auth = await getUserFromSession()
        if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const routes = await prisma.route.findMany({
            include: {
                _count: {
                    select: { students: true, buses: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ routes })
    } catch (error) {
        console.error('Route list error:', error)
        return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const auth = await getUserFromSession()
        if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, morningTime, afternoonTime } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Route name is required' }, { status: 400 })
        }

        const route = await prisma.route.create({
            data: {
                name,
                morningTime,
                afternoonTime
            }
        })

        return NextResponse.json({ route })
    } catch (error) {
        console.error('Route create error:', error)
        return NextResponse.json({ error: 'Failed to create route' }, { status: 500 })
    }
}
