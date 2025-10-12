// src/modules/payments/types/payment.types.ts

import type { Types } from "mongoose";

/** Tahsilat türü */
export type PaymentKind = "payment" | "refund" | "chargeback";

/** Yaşam döngüsü durumu */
export type PaymentStatus =
  | "pending"
  | "confirmed"
  | "partially_allocated"
  | "allocated"
  | "failed"
  | "canceled"
  | "refunded";

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

export interface IPayerSnapshot {
  name?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
}

export interface IInstrumentSnapshot {
  type?: "card" | "bank" | "cash" | "wallet" | "other";
  brand?: string;
  last4?: string;
  iban?: string;
  accountNoMasked?: string;
}

export interface IPaymentFee {
  type: "gateway" | "bank" | "manual";
  amount: number;
  currency: string;
  note?: string;
}

export interface IPaymentAllocation {
  invoice: Types.ObjectId;
  invoiceCode?: string;
  amount: number;
  appliedAt?: Date;
  note?: string;
}

export interface IPaymentLinks {
  customer?: Types.ObjectId;
  apartment?: Types.ObjectId;
  contract?: Types.ObjectId;
  order?: Types.ObjectId;
}

/** Ana Payment dokümanı */
export interface IPayment {
  _id?: Types.ObjectId;

  tenant: string;
  code: string;
  kind: PaymentKind;
  status: PaymentStatus;

  method: PaymentMethod;
  provider?: string;
  providerRef?: string;
  reference?: string;

  grossAmount: number;
  currency: string;
  fxRate?: number;
  fees?: IPaymentFee[];
  feeTotal?: number;
  netAmount?: number;

  receivedAt: Date;
  bookedAt?: Date;

  payer?: IPayerSnapshot;
  instrument?: IInstrumentSnapshot;

  links?: IPaymentLinks;

  allocations?: IPaymentAllocation[];
  allocatedTotal?: number;
  unappliedAmount?: number;

  metadata?: Record<string, any>;

  reconciled?: boolean;
  reconciledAt?: Date;
  statementRef?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type { IPayment as default };
