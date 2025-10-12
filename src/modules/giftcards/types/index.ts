import type { Document, Types } from "mongoose";

export type GiftcardStatus = "active" | "redeemed" | "expired" | "disabled";

export interface IGiftcardTxn {
  at: Date;
  order?: Types.ObjectId;
  amount_cents: number; // negatif (harcama) / pozitif (yükleme)
  note?: string;
}

export interface IGiftcard extends Document {
  tenant: string;
  code: string;
  initialBalance_cents: number;
  balance_cents: number;
  currency: string; // ISO-4217
  status: GiftcardStatus;
  expiresAt?: Date;
  txns: IGiftcardTxn[];
  createdAt?: Date;
  updatedAt?: Date;
}
