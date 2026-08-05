import { NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/paymentService';
import { billingGenerateSchema, validateBody } from '@/lib/validation';

export async function POST(req: Request) {
  try {
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
