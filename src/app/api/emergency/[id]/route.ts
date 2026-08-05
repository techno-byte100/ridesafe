import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromSession()
        if (!user || !['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const alert = await prisma.emergencyAlert.update({
            where: { id },
            data: { resolved: true }
        })

        return NextResponse.json({ success: true, alert })
    } catch (error) {
        console.error('Error resolving emergency alert:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
