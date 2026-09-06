import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Find all messages involving this user (either sent or received)
        const messages = await prisma.message.findMany({
            where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { id: true, name: true, role: true } },
                recipient: { select: { id: true, name: true, role: true } }
            }
        })

        return NextResponse.json({ messages })
    } catch (error) {
        console.error('Messages GET Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id } = await request.json()
        if (!id) return NextResponse.json({ error: 'Message ID required' }, { status: 400 })

        // Only the recipient can mark a message as read
        const msg = await prisma.message.findUnique({ where: { id } })
        if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        if (msg.recipientId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        await prisma.message.update({ where: { id }, data: { read: true } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Messages PATCH Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromSession()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const data = await request.json()
        if (!data.recipientId || !data.content) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        const message = await prisma.message.create({
            data: {
                senderId: user.id,
                recipientId: data.recipientId,
                content: data.content
            },
            include: {
                sender: { select: { id: true, name: true, role: true } },
                recipient: { select: { id: true, name: true, role: true } }
            }
        })

        return NextResponse.json({ message })
    } catch (error) {
        console.error('Messages POST Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
