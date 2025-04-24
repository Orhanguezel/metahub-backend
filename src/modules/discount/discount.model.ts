// src/models/discount.model.ts
import { Schema, model, Document, Types } from "mongoose";

export interface IDiscount extends Document {
  code: string;
  discountPercentage: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  categoryId?: Types.ObjectId;
  productId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const discountSchema = new Schema<IDiscount>(
  {
    code: { type: String, required: true, unique: true },
    discountPercentage: { type: Number, required: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
  },
  { timestamps: true }
);

export default model<IDiscount>("Discount", discountSchema);