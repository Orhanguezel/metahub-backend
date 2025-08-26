import { Schema, Model, models, model } from "mongoose";
import type {
  IPricing,
  IPricingFeatureItem,
  IPricingTier,
} from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/* helpers */
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) fields[locale] = { type: String, trim: true, default: "" };
  return fields;
};
const toUpperSnake = (s?: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();
const toKebab = (s?: string) =>
  s?.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const firstNonEmpty = (obj: Record<string,string> = {}) =>
  Object.values(obj).find(v => typeof v === "string" && v.trim()) || "";

/* sub-schemas */
const FeatureItemLimitSchema = new Schema(
  {
    type: { type: String, enum: ["boolean","number","string","unlimited"], required: true },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const FeatureItemSchema = new Schema<IPricingFeatureItem>(
  {
    key: { type: String, required: true, trim: true },
    label: { type: Object, default: () => localizedStringField() },
    tooltip: { type: Object, default: () => localizedStringField() },
    group: { type: Object, default: () => localizedStringField() },
    limit: { type: FeatureItemLimitSchema },
    order: { type: Number, default: 0 },
    highlight: { type: Boolean, default: false },
  },
  { _id: false }
);

const TierSchema = new Schema<IPricingTier>(
  {
    upTo: { type: Number },                        // optional
    pricePerUnit: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const localizedStringArrayField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) fields[locale] = [{ type: String, trim: true }];
  return fields;
};

const PricingSchema = new Schema<IPricing>(
  {
    tenant: { type: String, required: true, index: true },

    code: { type: String, trim: true },
    slug: { type: String, trim: true, lowercase: true },

    title: { type: Object, default: () => localizedStringField() },
    description: { type: Object, default: () => localizedStringField() },

    iconUrl: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    ctaLabel: { type: Object, default: () => localizedStringField() },
    ctaUrl: { type: String, trim: true },

    planType: { type: String, enum: ["free","basic","pro","business","enterprise"], default: "basic", index: true },
    category: { type: String, trim: true, index: true },
    status: { type: String, enum: ["draft","active","archived"], default: "draft", index: true },
    isActive: { type: Boolean, default: true, index: true },

    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },

    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, required: true, enum: ["USD","EUR","TRY","GBP"], index: true },
    period: { type: String, required: true, enum: ["monthly","yearly","once"] },
    setupFee: { type: Number, min: 0 },
    priceIncludesTax: { type: Boolean, default: false },
    vatRate: { type: Number, min: 0, max: 100 },

    unitName: { type: Object, default: () => localizedStringField() },
    includedUnits: { type: Number, min: 0 },
    pricePerUnit: { type: Number, min: 0 },
    tiers: { type: [TierSchema], default: [] },

    trialDays: { type: Number, min: 0 },
    minTermMonths: { type: Number, min: 0 },

    features: { type: Object, default: () => localizedStringArrayField() },
    featureItems: { type: [FeatureItemSchema], default: [] },

    regions: { type: [String], default: [], index: true },
    segments: { type: [String], default: [], index: true },

    isPopular: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0, index: true },

    effectiveFrom: { type: Date, index: true },
    effectiveTo: { type: Date, index: true },
  },
  { timestamps: true, minimize: false }
);

/* indexes (uniq per tenant) */
PricingSchema.index({ tenant: 1, code: 1 }, { unique: true, sparse: true });
PricingSchema.index({ tenant: 1, slug: 1 }, { unique: true, sparse: true });
PricingSchema.index({ tenant: 1, status: 1, isActive: 1, isPublished: 1 });
PricingSchema.index({ tenant: 1, category: 1, planType: 1, order: 1 });
PricingSchema.index({ tenant: 1, effectiveFrom: 1, effectiveTo: 1 });

/* normalize */
PricingSchema.pre("validate", function (next) {
  const anyThis = this as any;
  const titleFirst = firstNonEmpty(anyThis.title);

  if (!anyThis.code && titleFirst) anyThis.code = toUpperSnake(titleFirst);
  if (!anyThis.slug) {
    anyThis.slug = toKebab(anyThis.code || titleFirst || "plan");
  } else {
    anyThis.slug = toKebab(anyThis.slug);
  }

  if (anyThis.isPublished && !anyThis.publishedAt) {
    anyThis.publishedAt = new Date();
  }
  if (anyThis.effectiveFrom && anyThis.effectiveTo && anyThis.effectiveFrom > anyThis.effectiveTo) {
    return next(new Error("Invalid date range: effectiveFrom must be <= effectiveTo."));
  }
  next();
});

export const Pricing: Model<IPricing> =
  models.pricing || model<IPricing>("pricing", PricingSchema);

export { PricingSchema };
