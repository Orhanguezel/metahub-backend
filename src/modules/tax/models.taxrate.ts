import { Schema, model, models, type Model } from "mongoose";
import type { ITaxRate } from "./types";

const TaxRateSchema = new Schema<ITaxRate>(
  {
    tenant: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    zone: { type: Schema.Types.ObjectId, ref: "geozone", default: null, index: true },
    rate: { type: Number, required: true, min: 0, max: 1 }, // 0..1
    inclusive: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    productClasses: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    startAt: Date,
    endAt: Date,
  },
  { timestamps: true }
);

TaxRateSchema.index({ tenant: 1, name: 1 }, { unique: true });
TaxRateSchema.index({ tenant: 1, isActive: 1, priority: -1 });

export const TaxRate: Model<ITaxRate> =
  models.taxrate || model<ITaxRate>("taxrate", TaxRateSchema);

export default TaxRate;
