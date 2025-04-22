import { Schema, model, Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  title: string;
  description?: string;
  discount: number;
  expiresAt: Date;
  isActive: boolean;
  language: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    discount: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: { type: Boolean, default: true },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      required: true,
      default: "en",
    },
  },
  { timestamps: true }
);

export default model<ICoupon>("Coupon", couponSchema);
