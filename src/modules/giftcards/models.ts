import { Schema, model, models, type Model } from "mongoose";
import type { IGiftcard, IGiftcardTxn } from "./types";

const TxnSchema = new Schema<IGiftcardTxn>(
  {
    at: { type: Date, default: Date.now },
    order: { type: Schema.Types.ObjectId, ref: "order" },
    amount_cents: { type: Number, required: true },
    note: String,
  },
  { _id: false }
);

const GiftcardSchema = new Schema<IGiftcard>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    initialBalance_cents: { type: Number, required: true, min: 0 },
    balance_cents: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true },
    status: { type: String, enum: ["active","redeemed","expired","disabled"], default: "active", index: true },
    expiresAt: Date,
    txns: { type: [TxnSchema], default: [] },
  },
  { timestamps: true }
);

GiftcardSchema.index({ tenant: 1, code: 1 }, { unique: true });
GiftcardSchema.index({ tenant: 1, status: 1, expiresAt: 1, balance_cents: 1 });

/** Kod üretimi (yoksa) */
GiftcardSchema.pre("validate", function (next) {
  if (!this.code) {
    const y = new Date().getFullYear();
    (this as any).code = `GC-${y}-${String(Date.now()).slice(-6)}`;
  }
  next();
});

/** Otomatik expire işareti (okuma/yazmada gevşek kontrol) */
GiftcardSchema.pre("save", function (next) {
  if (this.status === "active" && this.expiresAt && this.expiresAt.getTime() <= Date.now()) {
    (this as any).status = "expired";
  }
  if (this.status === "active" && this.balance_cents <= 0) {
    (this as any).status = "redeemed";
  }
  next();
});

export const Giftcard: Model<IGiftcard> =
  models.giftcard || model<IGiftcard>("giftcard", GiftcardSchema);

export default Giftcard;
