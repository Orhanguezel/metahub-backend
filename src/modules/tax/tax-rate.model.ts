import { Schema, model, models, type Model, Types } from "mongoose";

export interface ITaxRate {
  tenant: string;
  name: string;                    // "KDV 20"
  zone?: Types.ObjectId | null;    // ref: geozone
  rate: number;                    // 0..1 (örn 0.20)
  inclusive?: boolean;             // fiyat KDV dahil mi
  priority?: number;               // birden fazla kuralda sıralama
  productClasses?: string[];       // "standard","reduced","books" ...
  createdAt?: Date;
  updatedAt?: Date;
}

const TaxRateSchema = new Schema<ITaxRate>(
  {
    tenant: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    zone: { type: Schema.Types.ObjectId, ref: "geozone", default: null, index: true },
    rate: { type: Number, required: true, min: 0, max: 1 },
    inclusive: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    productClasses: { type: [String], default: [] },
  },
  { timestamps: true }
);

TaxRateSchema.index({ tenant: 1, name: 1 }, { unique: true });

export const TaxRate: Model<ITaxRate> =
  models.taxrate || model<ITaxRate>("taxrate", TaxRateSchema);
export default TaxRate;
