import { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type PaymentMethod = "cash_on_delivery" | "credit_card" | "paypal";
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

export interface IPayment {
  order: Types.ObjectId;
  tenant: string; // Optional tenant field for multi-tenancy
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: Date;
  currency: string;
  details?: Record<string, any>;
  language?: SupportedLocale;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
