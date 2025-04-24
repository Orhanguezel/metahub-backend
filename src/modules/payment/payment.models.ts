import { Schema, model, Document, Types } from "mongoose";

export interface IPayment extends Document {
  order: Types.ObjectId;
  amount: number;
  method: "cash_on_delivery" | "credit_card" | "paypal";
  status: "pending" | "paid" | "failed";
  transactionId?: string;
  paidAt?: Date;
  language?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    amount: { type: Number, required: true },
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
    transactionId: { type: String },
    paidAt: { type: Date },
    language: { type: String, enum: ["tr", "en", "de"], default: "en" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model<IPayment>("Payment", paymentSchema);
