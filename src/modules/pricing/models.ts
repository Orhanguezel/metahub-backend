import { Schema, Model, models, model } from "mongoose";
import type { IPricing } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Çok dilli string field
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

// Çok dilli array field: doğrudan object!
const localizedStringArrayField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = [{ type: String, trim: true }];
  }
  return fields;
};

const PricingSchema = new Schema<IPricing>(
  {
    title: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    description: localizedStringField(),
    features: localizedStringArrayField(), // ÇOK DİLLİ FEATURES (doğrudan object)
    category: { type: String, trim: true },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, enum: ["USD", "EUR", "TRY"] },
    period: { type: String, required: true, enum: ["monthly", "yearly", "once"] }, // TEK SEFERLİK EKLENDİ
    isPopular: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false }
);

const Pricing: Model<IPricing> =
  models.pricing || model<IPricing>("pricing", PricingSchema);

export { Pricing, PricingSchema };
