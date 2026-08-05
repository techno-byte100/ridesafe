import { NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/paymentService';

export async function POST() {
  try {
    const result = await paymentService.syncInvoices();
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Billing Sync Error:", e);
    return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
  }
}
