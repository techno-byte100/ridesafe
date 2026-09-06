import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let setting = await prisma.systemSetting.findUnique({
      where: { key: 'PICKUP_TIMES' }
    })

    // Default times if not set by admin yet
    if (!setting) {
      setting = await prisma.systemSetting.create({
        data: {
          key: 'PICKUP_TIMES',
          value: JSON.stringify(['3:00 PM', '4:00 PM', '5:00 PM'])
        }
      })
    }

    return NextResponse.json({
      times: JSON.parse(setting.value)
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || !['ADMIN','SUPER_ADMIN','SCHOOL_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 401 })
    }

    const { times } = await req.json()

    if (!Array.isArray(times)) {
      return NextResponse.json({ error: 'Times must be an array' }, { status: 400 })
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key: 'PICKUP_TIMES' },
      update: { value: JSON.stringify(times) },
      create: { key: 'PICKUP_TIMES', value: JSON.stringify(times) },
    })

    return NextResponse.json({
      times: JSON.parse(setting.value)
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
