import { Schema, Document, Model, Types, models, model } from "mongoose";

export type PaymentMethod = "cash_on_delivery" | "credit_card" | "paypal";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface IPayment  {
  order: Types.ObjectId;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: Date;
  language: "tr" | "en" | "de";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["cash_on_delivery", "credit_card", "paypal"],
      default: "cash_on_delivery",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    transactionId: { type: String, trim: true },
    paidAt: { type: Date },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Guard + Model
const Payment: Model<IPayment> =
  models.Payment || model<IPayment>("Payment", paymentSchema);

export { Payment };
