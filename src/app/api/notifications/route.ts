import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const notifications = await prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        return NextResponse.json({ notifications })
    } catch (error) {
        console.error('Notifications GET Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const data = await request.json()
        if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

        const notification = await prisma.notification.findUnique({ where: { id: data.id } })
        if (notification?.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const updated = await prisma.notification.update({
            where: { id: data.id },
            data: { read: data.read }
        })

        return NextResponse.json({ notification: updated })
    } catch (error) {
        console.error('Notifications PATCH Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
