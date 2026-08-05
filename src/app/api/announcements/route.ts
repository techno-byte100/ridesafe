import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Broadcast announcement as notifications
export async function POST(req: Request) {
  try {
    const user = await getUserFromSession()
    if (!user || !['ADMIN','SUPER_ADMIN','SCHOOL_ADMIN'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { title, body, targetRole, type } = await req.json()
    if (!title || !body) return NextResponse.json({ error: 'Title and body required' }, { status: 400 })

    // Find target users
    const where: { role?: string } = {}
    if (targetRole && targetRole !== 'ALL') where.role = targetRole

    const users = await prisma.user.findMany({ where, select: { id: true } })

    // Batch create notifications
    const result = await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        title,
        body,
        type: type || 'INFO',
      }))
    })

    return NextResponse.json({ sent: result.count, targetRole: targetRole || 'ALL' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
