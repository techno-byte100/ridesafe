import crypto from 'crypto'

interface CreateBillInput {
  name: string
  email: string
  mobile?: string
  amount: number // in Ringgit (will be converted to cents)
  description: string
  callbackUrl: string
  redirectUrl: string
  reference?: string
}

interface CreateBillResult {
  success: boolean
  billId?: string
  url?: string
  error?: string
}

const SANDBOX_BASE = 'https://www.billplz-sandbox.com/api/v3'
const PROD_BASE = 'https://www.billplz.com/api/v3'

export class BillplzAdapter {
  private apiKey: string
  private collectionId: string
  private xSignatureKey: string
  private sandbox: boolean

  constructor() {
    this.apiKey = process.env.BILLPLZ_API_KEY || ''
    this.collectionId = process.env.BILLPLZ_COLLECTION_ID || ''
    this.xSignatureKey = process.env.BILLPLZ_X_SIGNATURE_KEY || ''
    this.sandbox = process.env.BILLPLZ_SANDBOX !== 'false'
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.collectionId)
  }

  /**
   * Creates a bill. Falls back to a local mock payment page when no
   * Billplz credentials are configured, so the full registration flow
   * (form -> pay -> auto account creation) works end-to-end in dev/test.
   */
  async createBill(input: CreateBillInput): Promise<CreateBillResult> {
    if (!this.isConfigured()) {
      console.log(`[BillplzAdapter] MOCK MODE — simulating bill for ${input.name} (RM ${input.amount})`)
      const mockBillId = 'mock_' + crypto.randomBytes(6).toString('hex')
      return { success: true, billId: mockBillId, url: `/register/mock-pay/${mockBillId}` }
    }

    try {
      const base = this.sandbox ? SANDBOX_BASE : PROD_BASE
      const res = await fetch(`${base}/bills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(`${this.apiKey}:`).toString('base64'),
        },
        body: JSON.stringify({
          collection_id: this.collectionId,
          email: input.email,
          mobile: input.mobile || '',
          name: input.name,
          amount: Math.round(input.amount * 100), // cents
          description: input.description,
          callback_url: input.callbackUrl,
          redirect_url: input.redirectUrl,
          reference_1_label: 'Reference',
          reference_1: input.reference || '',
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Billplz API error (${res.status}): ${text}`)
      }
      const data = await res.json()
      return { success: true, billId: data.id, url: data.url }
    } catch (e) {
      console.error('[BillplzAdapter] createBill failed', e)
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }
  }

  /**
   * Verifies the X-Signature sent by Billplz on bill callbacks.
   * Per Billplz docs: strip the "billplz[...]" wrapper from each field name,
   * sort remaining key/value pairs case-insensitively by key, concatenate as
   * `key+value` with no separator, join pairs with "|", then HMAC-SHA256 with
   * the X Signature key from account settings.
   */
  verifyXSignature(fields: Record<string, string>, receivedSignature: string): boolean {
    if (!this.xSignatureKey) {
      // No signature key configured (mock/dev mode) — cannot cryptographically verify.
      return false
    }
    const keys = Object.keys(fields).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    const source = keys.map(k => `${k}${fields[k] ?? ''}`).join('|')
    const computed = crypto.createHmac('sha256', this.xSignatureKey).update(source).digest('hex')
    try {
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(receivedSignature))
    } catch {
      return false
    }
  }
}

export const billplzAdapter = new BillplzAdapter()
