// src/modules/payments/types.ts
import type { Types } from "mongoose";

/** Tahsilat türü */
export type PaymentKind =
  | "payment"     // müşteriden tahsilat
  | "refund"      // müşteriye iade
  | "chargeback"; // kart itirazı / ters ibraz

/** Yaşam döngüsü durumu */
export type PaymentStatus =
  | "pending"              // başlatıldı, onay bekliyor
  | "confirmed"            // kasaya girdi (capture / hesaba geçti)
  | "partially_allocated"  // fatura(lar)a kısmen dağıtıldı
  | "allocated"            // tamamen dağıtıldı
  | "failed"               // başarısız
  | "canceled";            // iptal / void

/** Ödeme yöntemi */
export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "sepa"
  | "ach"
  | "card"
  | "wallet"
  | "check"
  | "other";

/** Ödeyen taraf snapshot’ı (fatura alıcısından bağımsız, anlık bilgi) */
export interface IPayerSnapshot {
  name?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
}

/** Enstrüman snapshot’ı (kart/banka/cüzdan bilgisi, maskeli) */
export interface IInstrumentSnapshot {
  type?: "card" | "bank" | "cash" | "wallet" | "other";
  brand?: string;          // Visa, MasterCard, Banka adı vb.
  last4?: string;          // kart/hesap son 4
  iban?: string;           // maske önerilir
  accountNoMasked?: string;
}

/** Kesinti kalemi (gateway/banka/manuel) */
export interface IPaymentFee {
  type: "gateway" | "bank" | "manual";
  amount: number;     // fee, kendi currency’sinde
  currency: string;   // "EUR" / "TRY" ...
  note?: string;
}

/** Ödemenin faturaya dağılımı */
export interface IPaymentAllocation {
  invoice: Types.ObjectId;   // ref: invoice
  invoiceCode?: string;      // rapor kolaylığı için snapshot
  amount: number;            // genelde payment currency ile aynı varsayılır
  appliedAt?: Date;
  note?: string;
}

/** İlişkilendirme linkleri (raporlar için) */
export interface IPaymentLinks {
  customer?: Types.ObjectId;   // ref: customer
  apartment?: Types.ObjectId;  // ref: apartment
  contract?: Types.ObjectId;   // ref: contract
}

/** Ana Payment dokümanı (schema ile birebir) */
export interface IPayment {
  _id?: Types.ObjectId;

  tenant: string;          // multi-tenant
  code: string;            // PMT-YYYY-xxxx (tenant+code unique)
  kind: PaymentKind;
  status: PaymentStatus;

  method: PaymentMethod;
  provider?: string;       // "stripe","iyzico","paypal","manual","bank"
  providerRef?: string;    // gateway transaction id / dekont no
  reference?: string;      // banka açıklama / çek no vb.

  grossAmount: number;     // kesintiler öncesi toplam
  currency: string;        // "EUR","TRY"...
  fxRate?: number;         // opsiyonel raporlama kuru
  fees?: IPaymentFee[];    // kesintiler
  feeTotal?: number;       // snapshot: fees toplamı
  netAmount?: number;      // snapshot: gross - feeTotal

  receivedAt: Date;        // fiili tahsil tarihi
  bookedAt?: Date;         // muhasebeye işlenme tarihi (ops)

  payer?: IPayerSnapshot;  // anlık müşteri bilgisi
  instrument?: IInstrumentSnapshot;

  links?: IPaymentLinks;

  allocations?: IPaymentAllocation[]; // fatura dağılımları
  allocatedTotal?: number;            // snapshot
  unappliedAmount?: number;           // snapshot: net - allocatedTotal

  metadata?: Record<string, any>;     // gateway/banka ham json

  reconciled?: boolean;   // ekstre ile mutabakat
  reconciledAt?: Date;
  statementRef?: string;  // ekstre satır ID’si

  createdAt: Date;
  updatedAt: Date;
}
