import { Schema, model, Document, Types } from "mongoose";

export type MovementType = "increase" | "decrease" | "adjust" | "order" | "return" | "manual";

export interface IStockMovement extends Document {
  product: Types.ObjectId;
  type: MovementType;
  quantity: number;
  note?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    type: {
      type: String,
      enum: ["increase", "decrease", "adjust", "order", "return", "manual"],
      required: true,
    },
    quantity: { type: Number, required: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default model<IStockMovement>("StockMovement", stockMovementSchema);
