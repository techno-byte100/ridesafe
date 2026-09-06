import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

/**
 * Lightweight, parent-safe lookup of "who do I message at the school" —
 * returns just an admin contact's id/name, not the full user list
 * (which /api/admin/users correctly restricts to admin roles only).
 */
export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { organizationId: true } })

    // Prefer an admin in the same organisation, then any admin, then super admin.
    const admin = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SCHOOL_ADMIN'] }, organizationId: dbUser?.organizationId ?? undefined },
      select: { id: true, name: true },
    }) || await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SCHOOL_ADMIN'] } },
      select: { id: true, name: true },
    }) || await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true, name: true },
    })

    if (!admin) {
      return NextResponse.json({ error: 'No school contact found' }, { status: 404 })
    }

    return NextResponse.json({ admin })
  } catch (error) {
    console.error('School contact lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
