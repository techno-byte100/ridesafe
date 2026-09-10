import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getUserFromSession } from '@/lib/auth/auth'
import { logAudit } from '@/lib/services/auditService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'users'

    let csvContent = ''
    let filename = `ridesafe_${type}_${new Date().toISOString().slice(0, 10)}.csv`

    if (type === 'users') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          organizationId: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'OrganizationId', 'LastLoginAt', 'CreatedAt']
      const rows = users.map(u => [
        u.id,
        `"${(u.name || '').replace(/"/g, '""')}"`,
        `"${(u.email || '').replace(/"/g, '""')}"`,
        `"${(u.phone || '').replace(/"/g, '""')}"`,
        u.role,
        u.organizationId || '',
        u.lastLoginAt ? u.lastLoginAt.toISOString() : '',
        u.createdAt.toISOString(),
      ].join(','))
      csvContent = [headers.join(','), ...rows].join('\n')
    } else if (type === 'organizations') {
      const orgs = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          subscriptionTier: true,
          maxBuses: true,
          maxStudents: true,
          maxUsers: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const headers = ['ID', 'Name', 'Address', 'Phone', 'SubscriptionTier', 'MaxBuses', 'MaxStudents', 'MaxUsers', 'IsActive', 'CreatedAt']
      const rows = orgs.map(o => [
        o.id,
        `"${(o.name || '').replace(/"/g, '""')}"`,
        `"${(o.address || '').replace(/"/g, '""')}"`,
        `"${(o.phone || '').replace(/"/g, '""')}"`,
        o.subscriptionTier,
        o.maxBuses,
        o.maxStudents,
        o.maxUsers,
        o.isActive ? 'true' : 'false',
        o.createdAt.toISOString(),
      ].join(','))
      csvContent = [headers.join(','), ...rows].join('\n')
    } else if (type === 'audit-logs') {
      const logs = await prisma.auditLog.findMany({
        take: 500,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      })

      const headers = ['ID', 'Timestamp', 'User', 'Email', 'Action', 'Target', 'TargetId', 'IPAddress', 'Details']
      const rows = logs.map(l => [
        l.id,
        l.createdAt.toISOString(),
        `"${(l.user?.name || '').replace(/"/g, '""')}"`,
        `"${(l.user?.email || '').replace(/"/g, '""')}"`,
        l.action,
        l.target || '',
        l.targetId || '',
        l.ipAddress || '',
        `"${(l.details || '').replace(/"/g, '""')}"`,
      ].join(','))
      csvContent = [headers.join(','), ...rows].join('\n')
    } else {
      return NextResponse.json({ error: 'Invalid export type. Expected users, organizations, or audit-logs.' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
    await logAudit({
      userId: user.id,
      action: 'EXPORT_DATA',
      target: type,
      details: { exportType: type, count: csvContent.split('\n').length - 1 },
      ipAddress: ip,
    })

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
