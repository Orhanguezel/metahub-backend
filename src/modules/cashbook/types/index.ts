import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type CurrencyCode = "USD" | "EUR" | "TRY";
export type CashAccountType = "cash" | "bank" | "other";
export type EntryDirection = "in" | "out";

export interface ICashAccount {
  _id?: Types.ObjectId;
  tenant: string;
  code: string;                 // UPPER_SNAKE, unique per tenant
  name: string;                 // hesap adı (DB’de düz metin)
  type: CashAccountType;
  currency: CurrencyCode;
  openingBalance: number;       // başlangıç bakiyesi
  currentBalance: number;       // anlık bakiye (otomatik güncellenir)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICashEntrySource {
  module: "manual" | "invoice" | "payment" | "expense" | "adjustment" | "job";
  refId?: Types.ObjectId;       // ilgili doküman
}

export interface ICashEntry {
  _id?: Types.ObjectId;

  tenant: string;
  accountId: Types.ObjectId;    // ref: cashaccount
  date: Date;                   // değer tarihi
  direction: EntryDirection;    // in/out
  amount: number;               // >= 0
  currency: CurrencyCode;       // hesapla aynı olmalı
  description?: string;
  category?: string;            // isteğe bağlı sınıflama (fuel/material/...)
  tags?: string[];

  // iş bağlamları
  apartmentId?: Types.ObjectId;
  contractId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  paymentId?: Types.ObjectId;
  expenseId?: Types.ObjectId;
  jobId?: Types.ObjectId;

  source: ICashEntrySource;     // “manual” değilse kilitlenir
  locked: boolean;              // sistem üretti ise true
  isReconciled: boolean;        // mutabakat
  reconciliationId?: string;
  reconciledAt?: Date;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
