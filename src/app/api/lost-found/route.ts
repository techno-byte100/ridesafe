import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { description } = await req.json()
    if (!description?.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 })
    const item = await prisma.lostFoundItem.create({ data: { reportedBy: user.id, description: description.trim() } })
    return NextResponse.json({ item })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const items = await prisma.lostFoundItem.findMany({
      orderBy: { createdAt: 'desc' }, take: 50,
      include: { reporter: { select: { name: true, role: true } } }
    })
    return NextResponse.json({ items })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getUserFromSession()
    if (!user || !['ADMIN','SUPER_ADMIN','SCHOOL_ADMIN'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id, status } = await req.json()
    if (!id || !['OPEN','FOUND','CLOSED'].includes(status))
      return NextResponse.json({ error: 'Invalid' }, { status: 400 })
    const item = await prisma.lostFoundItem.update({ where: { id }, data: { status } })
    return NextResponse.json({ item })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
