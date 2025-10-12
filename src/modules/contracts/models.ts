import { Schema, model, models, type Model } from "mongoose";
import type { IContract, IContractLine, IContractBilling } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";
import { isValidObjectId as isValidObjId } from "@/core/middleware/auth/validation";

/* i18n string alanı */
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

/* --- Parties --- */
const PartiesSchema = new Schema(
  {
    apartment: { type: Schema.Types.ObjectId, ref: "apartment", required: true },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      set: (v: any) => (isValidObjId(v) ? v : undefined),
    },
    contactSnapshot: {
      name: { type: String, trim: true },
      phone: String,
      email: String,
      role: String,
    },
  },
  { _id: false }
);

/* --- Lines --- */
const ContractLineSchema = new Schema<IContractLine>(
  {
    service: { type: Schema.Types.ObjectId, ref: "servicecatalog", required: true },
    name: { type: Object },               // TranslatedLabel
    description: { type: Object },        // TranslatedLabel

    isIncludedInContractPrice: { type: Boolean, default: true },
    unitPrice: { type: Number, min: 0 },
    currency: { type: String },

    schedule: {
      every: { type: Number, min: 1 },
      unit: { type: String, enum: ["day", "week", "month"] },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }],
      exceptions: [{ type: Number, min: 0, max: 6 }],
    },

    manpower: {
      headcount: { type: Number, min: 1 },
      durationMinutes: { type: Number, min: 1 },
    },

    isActive: { type: Boolean, default: true },
    notes: { type: Object },              // TranslatedLabel
  },
  { _id: false }
);

/* --- Billing --- */
const DueRuleSchema = new Schema(
  {
    type: { type: String, enum: ["dayOfMonth", "nthWeekday"], required: true },
    day: { type: Number, min: 1, max: 31 },        // dayOfMonth
    nth: { type: Number, min: 1, max: 5 },         // nthWeekday
    weekday: { type: Number, min: 0, max: 6 },     // nthWeekday
  },
  { _id: false }
);

const BillingSchema = new Schema<IContractBilling>(
  {
    mode: { type: String, enum: ["fixed", "perLine"], default: "fixed", required: true },
    amount: { type: Number, min: 0 },
    currency: { type: String, required: true, default: "EUR" },
    period: { type: String, enum: ["weekly", "monthly", "quarterly", "yearly"], required: true },
    dueRule: { type: DueRuleSchema, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    graceDays: { type: Number, min: 0, default: 0 },
    revisions: [
      {
        validFrom: { type: Date, required: true },
        amount: { type: Number, min: 0 },
        currency: { type: String },
        reason: { type: String },
        _id: false,
      },
    ],
  },
  { _id: false }
);

/* --- Contract --- */
const ContractSchema = new Schema<IContract>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, index: true }, // tenant+code unique
    title: localizedStringField(),
    description: localizedStringField(),

    parties: { type: PartiesSchema, required: true },
    lines: { type: [ContractLineSchema], default: [] },
    billing: { type: BillingSchema, required: true },

    status: {
      type: String,
      enum: ["draft", "active", "suspended", "terminated", "expired"],
      default: "draft",
      index: true,
    },
    activatedAt: Date,
    terminatedAt: Date,
    reasonNote: String,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* --- Indexes --- */
ContractSchema.index({ tenant: 1, code: 1 }, { unique: true });
ContractSchema.index({ tenant: 1, "parties.apartment": 1, status: 1 });
ContractSchema.index({ tenant: 1, "parties.customer": 1, status: 1 });
ContractSchema.index({ tenant: 1, "billing.period": 1 });
ContractSchema.index({ tenant: 1, "billing.startDate": 1 });
ContractSchema.index({ tenant: 1, isActive: 1 });

/* --- Hooks / Helpers --- */
ContractSchema.pre("validate", function (next) {
  // code boşsa basit bir kod üret (ör: C-2025-000001). Dışarıda gerçek seq. ile override edebilirsin.
  if (!this.code) {
    const y = new Date().getFullYear();
    (this as any).code = `C-${y}-${String(Date.now()).slice(-6)}`;
  }
  next();
});

ContractSchema.pre("save", function (next) {
  // isActive bayrağını statüye göre uyumlu tut
  if (["terminated", "expired"].includes(this.status)) {
    this.isActive = false;
  }
  // draft→active geçiş izi
  if (this.isModified("status") && this.status === "active" && !this.activatedAt) {
    this.activatedAt = new Date();
  }
  next();
});

export const Contract: Model<IContract> =
  models.contract || model<IContract>("contract", ContractSchema);
