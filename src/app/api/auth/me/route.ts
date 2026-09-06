import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession, clearSession } from '@/lib/auth/auth'
import prisma from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

const VALID_LOCALES = ['en', 'ms', 'zh']

export async function POST() {
  await clearSession()
  return NextResponse.json({ success: true })
}

// Persist the caller's own language preference to their account, so it's
// scoped per-user instead of leaking across roles via a shared browser key.
export async function PATCH(req: NextRequest) {
  const session = await getUserFromSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { locale } = await req.json().catch(() => ({}))
  if (!VALID_LOCALES.includes(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
  }
  await prisma.user.update({ where: { id: session.id }, data: { locale } })
  return NextResponse.json({ success: true })
}

export async function GET() {
  const session = await getUserFromSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  // The JWT only carries {id, role} — look up the full profile so callers
  // (dashboard greetings, Personal Info panels, locale) get real data
  // instead of just the bare session payload.
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, phone: true, organizationId: true, locale: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return NextResponse.json({ user })
}
