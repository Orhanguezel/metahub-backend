import type { Request } from "express";

/** Desteklenen sağlayıcılar */
export type PaymentProvider =
  | "stripe"
  | "paypal"
  | "iyzico"
  | "paytr"
  | "papara"
  | "paycell"
  | "craftgate"
  | "manual";

/** Payment Intent durumları */
export type IntentStatus =
  | "requires_payment_method"
  | "requires_action"
  | "processing"
  | "succeeded"
  | "canceled"
  | "failed";

/** Ödeme yöntemi (gateway seviyesinde) */
export type GatewayMethod = "card" | "wallet" | "bank_transfer" | "cash" | "other";

/** UI modu (FE akışını yönlendirmek için) */
export type UIMode = "embedded" | "hosted" | "elements";

/** Kimlik bilgileri (esnek) */
export interface GatewayCredentials {
  apiKey?: string;
  secretKey?: string;
  publicKey?: string;
  merchantId?: string;
  clientId?: string;
  clientSecret?: string;
  webhookSecret?: string;
  baseUrl?: string;
  mode?: "test" | "live";
  [k: string]: any;
}

/** Checkout giriş verisi */
export interface CreateCheckoutInput {
  tenant: string;
  provider: PaymentProvider;
  method?: GatewayMethod;
  amount: number;          // minor unit (ör. 1234 -> 12.34)
  currency: string;        // ISO 4217
  orderId?: string;
  customer?: { id?: string; name?: string; email?: string; phone?: string };
  items?: Array<{ name: string; qty: number; unitAmount: number }>;
  returnUrl?: string;      // 3DS/hosted dönüş
  cancelUrl?: string;
  metadata?: Record<string, any>;
  locale?: string;         // "tr-TR","en-US"
  credentials?: GatewayCredentials | Record<string, any>;

  /** NEW: FE akışına yön veren ipucu */
  ui_mode?: UIMode;        // "embedded" | "hosted" | "elements"
}

/** Checkout çıktısı */
export interface CreateCheckoutOutput {
  providerRef: string;     // gateway transaction / session id
  clientSecret?: string;   // Stripe cs_* veya pi_*_secret_* / seti_*_secret_*
  hostedUrl?: string;      // hosted page URL
  payload?: any;           // FE’ye geçilecek ek data
}

/** Capture (gecikmeli tahsil) */
export interface CaptureInput {
  tenant: string;
  provider: PaymentProvider;
  providerRef: string;
  amount?: number;  // minor unit
  credentials?: GatewayCredentials | Record<string, any>;
}
export interface CaptureOutput {
  ok: boolean;
  status: IntentStatus;
  raw?: any;
}

/** Refund */
export interface RefundInput {
  tenant: string;
  provider: PaymentProvider;
  /** Orijinal ödeme referansı (örn: Stripe payment_intent / PayTR sipariş no) */
  providerRef: string;
  amount?: number;  // minor unit
  reason?: string;
  credentials?: GatewayCredentials | Record<string, any>;
}

/** Refund çıktısı */
export interface RefundOutput {
  ok: boolean;
  status: "succeeded" | "failed" | "processing";
  refundRef?: string;
  raw?: any;
}

/** Webhook olayı — tüm adapterlar bu forma normalize eder */
export interface WebhookEvent {
  type:
    | "payment.succeeded"
    | "payment.failed"
    | "payment.canceled"
    | "payment.processing"
    | "refund.succeeded"
    | "refund.failed";
  /** Orijinal ödeme referansı (örn: payment_intent / transaction id) */
  providerRef: string;
  /** (Refund event'lerinde) sağlayıcı iade referansı (refund.id vb.) */
  refundRef?: string;
  amount?: number;   // minor unit
  currency?: string; // UPPER
  method?: GatewayMethod;
  raw: any;
}

/** Adapter sözleşmesi */
export interface GatewayAdapter {
  readonly name: PaymentProvider;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput>;
  capture(input: CaptureInput): Promise<CaptureOutput>;
  refund(input: RefundInput): Promise<RefundOutput>;
  parseWebhook(req: Request, creds: GatewayCredentials | Record<string, any>): Promise<WebhookEvent>;
}
