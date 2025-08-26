import { Schema, model, models, type Model } from "mongoose";
import type {
  IPromotion,
  IPromotionRules,
  IPromotionEffect,
  IPromotionRedemption,
  TranslatedLabel,
} from "./types";

/* ---- Promotion ---- */

const TranslatedSchema = new Schema<TranslatedLabel>({}, { _id: false, strict: false });

const RulesSchema = new Schema<IPromotionRules>(
  {
    startsAt: { type: Date },
    endsAt: { type: Date },
    minOrder: {
      amount: { type: Number, min: 0 },
      currency: { type: String, default: "TRY" },
    },
    scope: {
      branchIds: [{ type: Schema.Types.ObjectId, ref: "branch" }],
      categoryIds: [{ type: Schema.Types.ObjectId, ref: "menucategory" }],
      itemIds: [{ type: Schema.Types.ObjectId, ref: "menuitem" }],
      serviceTypes: [{ type: String, enum: ["delivery", "pickup", "dinein"] }],
    },
    firstOrderOnly: { type: Boolean, default: false },
    usageLimit: { type: Number, min: 0 }, // undefined → limitsiz
    perUserLimit: { type: Number, min: 0 },
  },
  { _id: false }
);

const EffectSchema = new Schema<IPromotionEffect>(
  {
    type: { type: String, required: true, enum: ["percentage", "fixed", "free_delivery", "bxgy"] },
    value: { type: Number }, // percentage(1-100) / fixed(amount)
    currency: { type: String },
    bxgy: {
      buyQty: { type: Number, min: 1 },
      getQty: { type: Number, min: 1 },
      itemScope: {
        itemIds: [{ type: Schema.Types.ObjectId, ref: "menuitem" }],
        categoryIds: [{ type: Schema.Types.ObjectId, ref: "menucategory" }],
      },
    },
  },
  { _id: false }
);

const PromotionSchema = new Schema<IPromotion>(
  {
    tenant: { type: String, required: true, index: true, trim: true },
    kind: { type: String, enum: ["auto", "coupon"], default: "auto" },
    code: { type: String, uppercase: true, trim: true },
    name: { type: Map, of: String, required: true, default: {} },
    description: { type: Map, of: String, default: {} },

    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    priority: { type: Number, default: 100 }, // düşüğü arkada istiyorsan ters çevir
    stackingPolicy: { type: String, enum: ["none", "with_different", "with_same"], default: "with_different" },

    rules: { type: RulesSchema, default: {} },
    effect: { type: EffectSchema, required: true },
  },
  { timestamps: true }
);

/* benzersizlik ve sorgu hızları */
PromotionSchema.index({ tenant: 1, kind: 1, isActive: 1, isPublished: 1, "rules.startsAt": 1, "rules.endsAt": 1 });
PromotionSchema.index({ tenant: 1, code: 1 }, { unique: false, partialFilterExpression: { code: { $type: "string" } } });
PromotionSchema.index({ tenant: 1, priority: 1 });

PromotionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    if (ret?.name instanceof Map) ret.name = Object.fromEntries(ret.name);
    if (ret?.description instanceof Map) ret.description = Object.fromEntries(ret.description);
    return ret;
  },
});

export const Promotion: Model<IPromotion> =
  models.promotion || model<IPromotion>("promotion", PromotionSchema);

/* ---- Redemption ---- */

const RedemptionSchema = new Schema<IPromotionRedemption>(
  {
    tenant: { type: String, required: true, index: true, trim: true },
    promotion: { type: Schema.Types.ObjectId, ref: "promotion", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "user" },
    orderId: { type: Schema.Types.ObjectId, required: true, index: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "TRY" },
  },
  { timestamps: true }
);

RedemptionSchema.index({ tenant: 1, promotion: 1, orderId: 1 }, { unique: true }); // idempotency
RedemptionSchema.index({ tenant: 1, promotion: 1, user: 1 });

export const PromotionRedemption: Model<IPromotionRedemption> =
  models.promotionredemption ||
  model<IPromotionRedemption>("promotionredemption", RedemptionSchema);

export default Promotion;
