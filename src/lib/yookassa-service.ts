import axios from 'axios'
import crypto from 'crypto'

interface YooKassaPaymentRequest {
  amount: {
    value: string
    currency: string
  }
  confirmation: {
    type: 'redirect'
    return_url: string
  }
  capture: boolean
  description?: string
  metadata?: Record<string, any>
}

interface YooKassaPaymentResponse {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  amount: {
    value: string
    currency: string
  }
  confirmation?: {
    type: 'redirect'
    confirmation_url: string
  }
  created_at: string
  description?: string
  metadata?: Record<string, any>
  payment_method?: {
    type: string
    id: string
    saved: boolean
    title?: string
  }
}

interface YooKassaWebhookPayload {
  type: 'notification'
  event: 'payment.succeeded' | 'payment.canceled' | 'payment.waiting_for_capture'
  object: YooKassaPaymentResponse
}

class YooKassaService {
  private readonly apiUrl = 'https://api.yookassa.ru/v3'
  private readonly shopId: string
  private readonly secretKey: string

  constructor() {
    this.shopId = process.env.YOOKASSA_SHOP_ID || '1100078'
    this.secretKey = process.env.YOOKASSA_SECRET_KEY || 'test_5pt99RUB8Wj4rB6y63OKbG2vdBEMm0sJnsmDSQwhiXQ'
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')
    return `Basic ${credentials}`
  }

  private generateIdempotenceKey(): string {
    return crypto.randomUUID()
  }

  async createPayment(params: {
    amount: number
    currency?: string
    description?: string
    returnUrl: string
    metadata?: Record<string, any>
  }): Promise<YooKassaPaymentResponse> {
    const paymentData: YooKassaPaymentRequest = {
      amount: {
        value: params.amount.toFixed(2),
        currency: params.currency || 'RUB'
      },
      confirmation: {
        type: 'redirect',
        return_url: params.returnUrl
      },
      capture: true,
      description: params.description,
      metadata: params.metadata
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/payments`,
        paymentData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Idempotence-Key': this.generateIdempotenceKey(),
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error) {
      console.error('YooKassa payment creation error:', error)
      throw new Error('Ошибка создания платежа')
    }
  }

  async getPayment(paymentId: string): Promise<YooKassaPaymentResponse> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error) {
      console.error('YooKassa get payment error:', error)
      throw new Error('Ошибка получения информации о платеже')
    }
  }

  async capturePayment(paymentId: string, amount?: number): Promise<YooKassaPaymentResponse> {
    const captureData: any = {}
    
    if (amount) {
      captureData.amount = {
        value: amount.toFixed(2),
        currency: 'RUB'
      }
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/payments/${paymentId}/capture`,
        captureData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Idempotence-Key': this.generateIdempotenceKey(),
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error) {
      console.error('YooKassa capture payment error:', error)
      throw new Error('Ошибка подтверждения платежа')
    }
  }

  async cancelPayment(paymentId: string): Promise<YooKassaPaymentResponse> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/payments/${paymentId}/cancel`,
        {},
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Idempotence-Key': this.generateIdempotenceKey(),
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error) {
      console.error('YooKassa cancel payment error:', error)
      throw new Error('Ошибка отмены платежа')
    }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!signature) return false

    try {
      const hmac = crypto.createHmac('sha256', this.secretKey)
      hmac.update(body)
      const expectedSignature = hmac.digest('hex')
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    } catch (error) {
      console.error('Webhook signature verification error:', error)
      return false
    }
  }

  parseWebhookPayload(body: string): YooKassaWebhookPayload | null {
    try {
      return JSON.parse(body) as YooKassaWebhookPayload
    } catch (error) {
      console.error('Webhook payload parsing error:', error)
      return null
    }
  }
}

export const yooKassaService = new YooKassaService()
export type { YooKassaPaymentResponse, YooKassaWebhookPayload } 