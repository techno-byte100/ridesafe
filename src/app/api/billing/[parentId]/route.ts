import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getUserFromSession } from '@/lib/auth/auth';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ parentId: string }> }
) {
  try {
    // B007 fix: Require authentication and enforce access control
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parentId = (await params).parentId;
    
    // Allow users to pass 'all' only for admins
    if (parentId === 'all') {
      if (!ADMIN_ROLES.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const allPayments = await prisma.payment.findMany({
        include: { parent: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ payments: allPayments });
    }

    // For specific parentId: allow admins OR the parent themselves only
    if (!ADMIN_ROLES.includes(user.role) && user.id !== parentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payments = await prisma.payment.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ payments });
  } catch (e: any) {
    console.error("Billing Fetch Error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
