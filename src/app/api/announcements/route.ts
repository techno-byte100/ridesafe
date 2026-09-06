import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN']

// List past announcements
export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user || !ADMIN_ROLES.includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ announcements })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Broadcast announcement as notifications, and keep a record of the broadcast itself
export async function POST(req: Request) {
  try {
    const user = await getUserFromSession()
    if (!user || !ADMIN_ROLES.includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { title, body, targetRole, type } = await req.json()
    if (!title?.trim() || !body?.trim()) return NextResponse.json({ error: 'Title and body required' }, { status: 400 })

    // Find target users
    const where: { role?: string } = {}
    if (targetRole && targetRole !== 'ALL') where.role = targetRole

    const users = await prisma.user.findMany({ where, select: { id: true } })

    // Batch create notifications
    const result = await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        title: title.trim(),
        body: body.trim(),
        type: type || 'INFO',
      }))
    })

    // Record the broadcast itself so it can be listed later
    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(), body: body.trim(),
        targetRole: targetRole || 'ALL', type: type || 'INFO',
        sentCount: result.count, createdBy: user.id,
      }
    })

    return NextResponse.json({ sent: result.count, targetRole: targetRole || 'ALL', announcement })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
