import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const auth = await getUserFromSession()
        if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN' && auth.role !== 'SCHOOL_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const students = await prisma.student.findMany({
            include: {
                parent: { select: { id: true, name: true, phone: true } },
                route: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ students })
    } catch (error) {
        console.error('Admin student list error:', error)
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const auth = await getUserFromSession()
        if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN' && auth.role !== 'SCHOOL_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, grade, level, parentContact1, parentContact2, parentId, routeId, pickupTime, isSelfPickup } = await request.json()

        if (!name || !grade || !level || !parentContact1) {
            return NextResponse.json({ error: 'Name, grade, level, and primary contact are required' }, { status: 400 })
        }

        const student = await prisma.student.create({
            data: {
                name,
                grade,
                level,
                parentContact1,
                parentContact2: parentContact2 || null,
                parentId: parentId || null,
                routeId: routeId || null,
                pickupTime: pickupTime || null,
                isSelfPickup: isSelfPickup || false
            },
            include: {
                parent: { select: { id: true, name: true } },
                route: { select: { id: true, name: true } }
            }
        })

        return NextResponse.json({ student })
    } catch (error) {
        console.error('Admin student create error:', error)
        return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
    }
}
