import { Schema, model, Document, Model, models } from "mongoose";

// ✅ Coupon Interface
interface ICoupon extends Document {
  code: string;
  tenant: string; // Optional tenant field for multi-tenancy
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

// ✅ Coupon Schema
const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    tenant: {
      type: String,
      required: true,
      index: true,
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

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const Coupon: Model<ICoupon> =
  models.Coupon || model<ICoupon>("Coupon", couponSchema);

export { Coupon, ICoupon };
export default Coupon;
