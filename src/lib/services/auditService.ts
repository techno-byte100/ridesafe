import prisma from '@/lib/db/prisma'

interface AuditLogParams {
  userId: string
  action: string
  target?: string
  targetId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

/**
 * Create an audit log entry for Super Admin actions.
 * Fire-and-forget — errors are logged but never block the caller.
 */
export async function logAudit({
  userId,
  action,
  target,
  targetId,
  details,
  ipAddress,
}: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        target: target ?? null,
        targetId: targetId ?? null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress ?? null,
      },
    })
  } catch (err) {
    // Never let audit logging break the primary operation
    console.error('[AuditLog] Failed to write audit entry:', err)
  }
}

/**
 * Fetch paginated audit logs with optional filters.
 */
export async function getAuditLogs({
  page = 1,
  limit = 50,
  userId,
  action,
  target,
  from,
  to,
}: {
  page?: number
  limit?: number
  userId?: string
  action?: string
  target?: string
  from?: Date
  to?: Date
}) {
  try {
    const { ensureSuperAdminSchema } = await import('@/lib/db/ensureSchema')
    await ensureSuperAdminSchema()

    const where: Record<string, unknown> = {}

    if (userId) where.userId = userId
    if (action) where.action = action
    if (target) where.target = target
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) }
  } catch (err) {
    console.warn('[AuditLog] Notice in getAuditLogs:', err)
    return { logs: [], total: 0, page: 1, limit, totalPages: 0 }
  }
}

