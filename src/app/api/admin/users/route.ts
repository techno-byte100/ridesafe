import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const auth = await getUserFromSession()
        if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                organizationId: true,
                createdAt: true,
                buses: { select: { id: true, plateNumber: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ users })
    } catch (error) {
        console.error('User list error:', error)
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const auth = await getUserFromSession()
        if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, email, password, role, phone, organizationId } = await request.json()

        // Validate name
        if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
            return NextResponse.json({ error: 'Name must be between 2 and 100 characters' }, { status: 400 })
        }
        // Validate email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
        }
        // Validate password
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
        }
        // Validate role
        const VALID_ROLES = ['ADMIN', 'DRIVER', 'PARENT', 'SCHOOL_ADMIN', 'SUPER_ADMIN']
        if (!VALID_ROLES.includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }
        // Validate phone — only digits, +, spaces, hyphens, parentheses
        if (phone && !/^[+0-9\s()\-]{7,20}$/.test(phone)) {
            return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
        }

        const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
        if (exists) {
            return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
        }

        // Validate organizationId if provided
        let resolvedOrgId: string | null = null
        if (organizationId) {
            const org = await prisma.organization.findUnique({ where: { id: organizationId } })
            if (!org) {
                return NextResponse.json({ error: 'Organisation not found' }, { status: 400 })
            }
            resolvedOrgId = organizationId
        }

        const passwordHash = await bcrypt.hash(password, 12)

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: passwordHash,
                role,
                phone: phone?.trim() || null,
                organizationId: resolvedOrgId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                organizationId: true,
            }
        })

        return NextResponse.json({ user })
    } catch (error) {
        console.error('User create error:', error)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
}
