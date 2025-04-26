// src/modules/coupon/coupon.models.ts
import { Schema, model, Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  label: {
    title: {
      tr: string;
      en: string;
      de: string;
    };
    description: {
      tr: string;
      en: string;
      de: string;
    };
  };
  discount: number;
  expiresAt: Date;
  isActive: boolean;
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
    label: {
      title: {
        tr: { type: String, required: true },
        en: { type: String, required: true },
        de: { type: String, required: true },
      },
      description: {
        tr: { type: String, required: true },
        en: { type: String, required: true },
        de: { type: String, required: true },
      },
    },
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Coupon = model<ICoupon>("Coupon", couponSchema);

export default Coupon;
