import { Schema, Model, models, model } from "mongoose";
import type { ICashAccount, ICashEntry } from "./types";

const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

/* -------- CashAccount -------- */
export const CashAccountSchema = new Schema<ICashAccount>(
  {
    tenant: { type: String, required: true, index: true },
    code:   { type: String, required: true, trim: true },       // UPPER_SNAKE
    name:   { type: String, required: true, trim: true },
    type:   { type: String, enum: ["cash", "bank", "other"], required: true },
    currency: { type: String, enum: ["USD", "EUR", "TRY"], required: true },
    openingBalance: { type: Number, default: 0, min: 0 },
    currentBalance: { type: Number, default: 0 },               // $inc ile güncellenir
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CashAccountSchema.index({ tenant: 1, code: 1 }, { unique: true });
CashAccountSchema.index({ tenant: 1, isActive: 1 });

CashAccountSchema.pre("validate", function (next) {
  if (this.code) this.code = toUpperSnake(this.code);
  if (this.isNew && (this.currentBalance === undefined || this.currentBalance === null)) {
    this.currentBalance = this.openingBalance || 0;
  }
  next();
});

export const CashAccount: Model<ICashAccount> =
  models.cashaccount || model<ICashAccount>("cashaccount", CashAccountSchema);

/* -------- CashEntry -------- */
export const CashEntrySchema = new Schema<ICashEntry>(
  {
    tenant: { type: String, required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: "cashaccount", required: true, index: true },
    date: { type: Date, required: true },

    direction: { type: String, enum: ["in", "out"], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["USD", "EUR", "TRY"], required: true },

    description: { type: String, trim: true },
    category: { type: String, trim: true },
    tags: [{ type: String, trim: true }],

    apartmentId: { type: Schema.Types.ObjectId, ref: "apartment" },
    contractId:  { type: Schema.Types.ObjectId, ref: "contract" },
    invoiceId:   { type: Schema.Types.ObjectId, ref: "invoice" },
    paymentId:   { type: Schema.Types.ObjectId, ref: "payment" },
    expenseId:   { type: Schema.Types.ObjectId, ref: "expense" },
    jobId:       { type: Schema.Types.ObjectId, ref: "job" },

    source: {
      module: { type: String, enum: ["manual", "invoice", "payment", "expense", "adjustment", "job"], required: true },
      refId:  { type: Schema.Types.ObjectId },
    },

    locked: { type: Boolean, default: false },

    isReconciled: { type: Boolean, default: false },
    reconciliationId: { type: String, trim: true },
    reconciledAt: { type: Date },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CashEntrySchema.index({ tenant: 1, accountId: 1, date: 1 });
CashEntrySchema.index({ tenant: 1, source: 1 });
CashEntrySchema.index({ tenant: 1, apartmentId: 1, date: 1 });
CashEntrySchema.index({ tenant: 1, isReconciled: 1 });

export const CashEntry: Model<ICashEntry> =
  models.cashentry || model<ICashEntry>("cashentry", CashEntrySchema);
