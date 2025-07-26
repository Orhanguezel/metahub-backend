import mongoose, { Schema, model, models, Types, Model } from "mongoose";

export type MovementType =
  | "increase"
  | "decrease"
  | "adjust"
  | "order"
  | "return"
  | "manual";

export interface IStockmovement {
  product: Types.ObjectId;
  type: MovementType;
  quantity: number;
  tenant: string; // Optional tenant field for multi-tenancy
  note?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const StockmovementSchema = new Schema<IStockmovement>(
  {
    product: { type: Schema.Types.ObjectId, ref: "product", required: true },
    type: {
      type: String,
      enum: ["increase", "decrease", "adjust", "order", "return", "manual"],
      required: true,
    },
    tenant: { type: String, required: true, index: true },
    quantity: { type: Number, required: true },
    note: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ✅ Guard + Tip belirleme
const Stockmovement: Model<IStockmovement> =
  models.stockmovement ||
  model<IStockmovement>("stockmovement", StockmovementSchema);

export { Stockmovement };
