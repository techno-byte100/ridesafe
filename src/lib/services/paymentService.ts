import { bukkuAdapter } from '../adapters/bukku'
import prisma from '../db/prisma';

export class PaymentService {
  /**
   * Generates a new invoice via Bukku and logs it into the local RideSafe DB
   */
  async generateBilling(parentId: string, amount: number, dueDate?: Date) {
    const parent = await prisma.user.findUnique({ where: { id: parentId } });
    if (!parent) throw new Error("Parent not found");

    // 1. External Integration: Invoke Bukku
    const bukkuRes = await bukkuAdapter.createInvoice(parent.name, amount, dueDate);
    
    if (!bukkuRes.success || !bukkuRes.invoiceId) {
       // Failure Strategy: Queue invoice or log failure state
       console.error("Failed to sync with Bukku API for parent", parentId);
       throw new Error("Billing API integration failed");
    }

    // 2. Internal Synchronization
    const payment = await prisma.payment.create({
      data: {
        parentId,
        amount,
        bukkuInvoiceId: bukkuRes.invoiceId,
        status: bukkuRes.status,
        dueDate
      }
    });

    return { payment, invoiceUrl: bukkuRes.url };
  }

  /**
   * Mock daily sync strategy for fetching updated invoice status
   */
  async syncInvoices() {
    console.log("[PaymentService] Running mock daily sync for pending Bukku invoices...");
    
    // In actual implementation, we'd pull PENDING invoices from our DB
    // then query Bukku API for their status, and patch Paid states into our DB.
    
    const pendingCount = await prisma.payment.count({ where: { status: 'PENDING' } });
    return { syncedCount: pendingCount, status: 'Completed Sync Routine Simulation' };
  }
}

export const paymentService = new PaymentService();
