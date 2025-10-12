// src/modules/shipping/shipping-method.model.ts
import { Schema, model, models, type Model } from "mongoose";
import type { IShippingMethod, IShippingRateRow } from "../types";

const RateRowSchema = new Schema<IShippingRateRow>(
  {
    minWeight: Number,
    maxWeight: Number,
    minSubtotal_cents: Number,
    maxSubtotal_cents: Number,
    price_cents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ShippingMethodSchema = new Schema<IShippingMethod>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, lowercase: true },
    name: { type: Map, of: String, required: true, default: {} },
    active: { type: Boolean, default: true, index: true },
    zones: { type: [Schema.Types.ObjectId], ref: "shipgeozone", default: [] },
    currency: { type: String, required: true, default: "USD" },
    calc: { type: String, enum: ["flat", "table", "free_over"], default: "flat" },
    flatPrice_cents: { type: Number, min: 0 },
    freeOver_cents: { type: Number, min: 0 },
    table: { type: [RateRowSchema], default: [] },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ShippingMethodSchema.index({ tenant: 1, code: 1 }, { unique: true });

ShippingMethodSchema.set("toJSON", {
  transform: (_doc, ret) => {
    if (ret?.name instanceof Map) ret.name = Object.fromEntries(ret.name);
    return ret;
  },
});

export const ShippingMethod: Model<IShippingMethod> =
  models.shippingmethod || model<IShippingMethod>("shippingmethod", ShippingMethodSchema);

export default ShippingMethod;
