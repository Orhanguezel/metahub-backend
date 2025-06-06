import { Schema, model, models, Types, Model } from "mongoose";
import type { IPayment } from "./types";

const paymentSchema = new Schema<IPayment>({
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  amount: { type: Number, required: true, min: 0 },
  method: {
    type: String,
    enum: ["cash_on_delivery", "credit_card", "paypal"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded", "cancelled"],
    default: "pending",
    required: true,
  },
  transactionId: { type: String, trim: true },
  paidAt: { type: Date },
  currency: { type: String, default: "EUR", required: true },
  details: { type: Schema.Types.Mixed }, // e.g. stripe/paypal JSON response
  language: {
    type: String,
    enum: ["tr", "en", "de"],
    default: "en",
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Payment: Model<IPayment> =
  models.Payment || model<IPayment>("Payment", paymentSchema);
