import { Schema, model, Document, Types } from "mongoose";

export type MovementType = "increase" | "decrease" | "adjust" | "order" | "return" | "manual";

export interface IStockmovement extends Document {
  product: Types.ObjectId;
  type: MovementType;
  quantity: number;
  note?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const stockmovementSchema = new Schema<IStockmovement>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    type: {
      type: String,
      enum: ["increase", "decrease", "adjust", "order", "return", "manual"],
      required: true,
    },
    quantity: { type: Number, required: true },
    note: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Stockmovement = model<IStockmovement>("Stockmovement", stockmovementSchema);

export default Stockmovement;
