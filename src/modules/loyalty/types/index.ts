import type { Document, Types } from "mongoose";

export type LoyaltyReason = "order" | "review" | "campaign" | "adjust" | "spend" | string;

export interface ILoyaltyLedger extends Document {
  tenant: string;
  user: Types.ObjectId;
  points: number;              // +kazanç / -harcama
  reason?: LoyaltyReason;
  order?: Types.ObjectId;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BalanceSummary = {
  balance: number;             // geçerli anda (expiresAt >= now) toplam
  totalEarned: number;         // tüm zamanlar (+)
  totalSpent: number;          // tüm zamanlar (-)
};
