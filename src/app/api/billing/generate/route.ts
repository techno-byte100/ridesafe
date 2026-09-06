import { NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/paymentService';
import { billingGenerateSchema, validateBody } from '@/lib/core/validation';
import { getUserFromSession } from '@/lib/auth/auth';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'];

export async function POST(req: Request) {
  try {
    // B006 fix: Require admin authentication before generating invoices
    const user = await getUserFromSession();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = validateBody(billingGenerateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { parentId, amount } = validation.data;


    // Default due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const result = await paymentService.generateBilling(parentId, Number(amount), dueDate);
    
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Billing Generation Error:", e);
    return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
  }
}
