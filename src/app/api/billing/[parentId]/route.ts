import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ parentId: string }> }
) {
  try {
    const parentId = (await params).parentId;
    
    // Allow users to pass 'all' roughly for admin to query all 
    if (parentId === 'all') {
      const allPayments = await prisma.payment.findMany({
        include: { parent: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ payments: allPayments });
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
