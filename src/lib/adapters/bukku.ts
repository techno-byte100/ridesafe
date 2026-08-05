export class BukkuAdapter {
  private apiKey: string;
  private organization: string;

  constructor(apiKey: string = process.env.BUKKU_API_KEY || 'MOCK_KEY') {
    this.apiKey = apiKey;
    this.organization = process.env.BUKKU_ORGANIZATION || 'RideSafe';
  }

  /**
   * Mock fetching the latest location for a bus/vehicle.
   */
  async createInvoice(parentName: string, amount: number, dueDate?: Date) {
    if (this.apiKey === 'MOCK_KEY' || !process.env.BUKKU_API_KEY) {
      console.log(`[BukkuAdapter] Simulating invoice creation for ${parentName} (RM ${amount})`);
      
      const mockInvoiceId = 'INV-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        success: true,
        invoiceId: mockInvoiceId,
        status: 'PENDING',
        url: `https://bukku.my/view/${mockInvoiceId}`
      };
    }

    try {
      // Stub integration to actual Bukku API
      const payload = {
        customer: parentName,
        amount: amount,
        due_date: dueDate?.toISOString(),
        description: "RideSafe Subscription Billing"
      };

      const res = await fetch(`https://api.bukku.my/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Bukku API Error');
      const data = await res.json();
      
      return {
        success: true,
        invoiceId: data.invoice.id,
        status: 'PENDING',
        url: data.invoice.public_url
      };
    } catch (e) {
      console.error('[BukkuAdapter] Invoice Creation Failed', e);
      return { success: false, error: e };
    }
  }
}

export const bukkuAdapter = new BukkuAdapter();
