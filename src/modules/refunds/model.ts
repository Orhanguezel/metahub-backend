import { Schema, model, models, type Model } from "mongoose";
import type { IRefund } from "./types";

const RefundSchema = new Schema<IRefund>(
  {
    tenant: { type: String, required: true, index: true },

    order: { type: Schema.Types.ObjectId, ref: "order", required: true, index: true },
    orderNo: { type: String, required: true, trim: true, index: true },

    provider: { type: String, required: true, lowercase: true, trim: true, index: true },
    status: { type: String, enum: ["pending","succeeded","failed"], default: "pending", index: true },

    amount_cents: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, uppercase: true, trim: true },

    reason: String,

    paymentProviderRef: { type: String, trim: true, index: true },
    providerRefundId:   { type: String, trim: true, index: true },

    raw: Schema.Types.Mixed,
  },
  { timestamps: true }
);

RefundSchema.index({ tenant: 1, createdAt: -1 });
RefundSchema.index({ tenant: 1, provider: 1, status: 1, createdAt: -1 });

export const Refund: Model<IRefund> =
  models.refund || model<IRefund>("refund", RefundSchema);
export default Refund;
