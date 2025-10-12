import { Schema, model, models, type Model } from "mongoose";

export interface IFeeRule {
  tenant: string;
  code: string;                       // "cod", "packaging", "service_fee"
  name: Map<string,string>;
  isActive: boolean;
  currency: string;
  mode: "fixed" | "percent";
  amount?: number;                    // cents (fixed)
  percent?: number;                   // 0..1 (percent)
  min_cents?: number;
  max_cents?: number;
  appliesWhen?: Array<"cod" | "below_free_shipping" | "express_shipping" | "all">;
  createdAt?: Date;
  updatedAt?: Date;
}

const FeeSchema = new Schema<IFeeRule>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, lowercase: true },
    name: { type: Map, of: String, required: true, default: {} },
    isActive: { type: Boolean, default: true, index: true },
    currency: { type: String, required: true, default: "USD" },
    mode: { type: String, enum: ["fixed","percent"], default: "fixed" },
    amount: Number,
    percent: Number,
    min_cents: Number,
    max_cents: Number,
    appliesWhen: { type: [String], default: [] },
  },
  { timestamps: true }
);

FeeSchema.index({ tenant: 1, code: 1 }, { unique: true });

export const FeeRule: Model<IFeeRule> = models.feerule || model<IFeeRule>("feerule", FeeSchema);
export default FeeRule;
