// src/modules/tax/models.ts
import { Schema, model, models, type Model } from "mongoose";

export interface ITaxRate {
  tenant: string;
  code: string;                 // "STD_TR_18"
  name: Map<string, string>;    // i18n
  ratePct: number;              // 0..100
  isInclusive: boolean;         // True: fiyat içinde KDV var
  country?: string;             // ISO-2: "TR", "DE"...
  state?: string;               // "34", "BE" gibi
  city?: string;
  postal?: string;              // regex/startsWith de olabilir
  productTaxClass?: string;     // "standard" | "reduced" | "digital" ...
  priority?: number;            // daha büyük => önce gelir
  isActive: boolean;
  startAt?: Date;
  endAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const TaxRateSchema = new Schema<ITaxRate>(
  {
    tenant: { type: String, index: true, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: Map, of: String, default: {} },
    ratePct: { type: Number, required: true, min: 0, max: 100 },
    isInclusive: { type: Boolean, default: false },
    country: String,
    state: String,
    city: String,
    postal: String,
    productTaxClass: { type: String, default: "standard" },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startAt: Date,
    endAt: Date,
  },
  { timestamps: true }
);

TaxRateSchema.index({ tenant: 1, code: 1 }, { unique: true });
TaxRateSchema.index({ tenant: 1, isActive: 1, priority: -1 });
TaxRateSchema.set("toJSON", {
  transform: (_doc, ret) => {
    if (ret?.name instanceof Map) ret.name = Object.fromEntries(ret.name);
    return ret;
  },
});

export const TaxRate: Model<ITaxRate> =
  models.taxrate || model<ITaxRate>("taxrate", TaxRateSchema);
export default TaxRate;
