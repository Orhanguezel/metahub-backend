import type { Document, Types } from "mongoose";

export type RefundStatus = "pending" | "succeeded" | "failed";

export interface IRefund extends Document {
  tenant: string;

  order: Types.ObjectId;          // ref: order
  orderNo: string;                // hızlı sorgu için

  provider: string;               // "stripe" | "iyzico" | ...
  status: RefundStatus;

  amount_cents: number;           // minor unit
  currency: string;               // ISO 4217

  reason?: string;

  /** eşleştirme için: ödeme sağlayıcısındaki orijinal payment reference */
  paymentProviderRef?: string;    // örn: Stripe payment_intent id
  /** bazı sağlayıcılar refund id döndürür */
  providerRefundId?: string;

  raw?: any;                      // sağlayıcı cevabı (son/progress snapshot)

  createdAt?: Date;
  updatedAt?: Date;
}
