import { Schema, model, models, type Model } from "mongoose";
import type { ILoyaltyLedger } from "./types";

const LoyaltyLedgerSchema = new Schema<ILoyaltyLedger>(
  {
    tenant: { type: String, required: true, index: true },
    user:   { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
    points: { type: Number, required: true }, // +/- olabilir
    reason: { type: String, trim: true },
    order:  { type: Schema.Types.ObjectId, ref: "order" },
    expiresAt: Date,
  },
  { timestamps: true }
);

LoyaltyLedgerSchema.index({ tenant: 1, user: 1, createdAt: -1 });
LoyaltyLedgerSchema.index({ tenant: 1, user: 1, expiresAt: 1 });
LoyaltyLedgerSchema.index({ tenant: 1, reason: 1 });

export const LoyaltyLedger: Model<ILoyaltyLedger> =
  models.loyaltyledger || model<ILoyaltyLedger>("loyaltyledger", LoyaltyLedgerSchema);

export default LoyaltyLedger;
