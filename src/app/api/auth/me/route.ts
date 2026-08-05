import { NextResponse } from 'next/server'
import { getUserFromSession, clearSession } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST() {
  await clearSession()
  return NextResponse.json({ success: true })
}

export async function GET() {
  const user = await getUserFromSession()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return NextResponse.json({ user })
}
