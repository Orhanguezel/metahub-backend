import { Schema, model, Model, models } from "mongoose";
import type { ICoupon, ICouponImage, TranslatedLabel } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Çoklu dil desteği için Map kullanımı
const translatedFieldSchema = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<string, any>);

const CouponImageSchema = new Schema<ICouponImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

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
    title: {
      type: Map,
      of: String,
      required: true,
    } as unknown as TranslatedLabel, // Çoklu dil desteği için
    description: {
      type: Map,
      of: String,
      required: true,
    } as unknown as TranslatedLabel, // Çoklu dil desteği için
    images: { type: [CouponImageSchema], default: [] },
    discount: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook: Kodun benzersizliği
couponSchema.pre("save", function (next) {
  if (!this.code) {
    this.code = "COUPON_" + Date.now(); // Örnek kod oluşturma
  }
  next();
});

const Coupon: Model<ICoupon> =
  models.coupon || model<ICoupon>("coupon", couponSchema);

export { Coupon };
export default Coupon;
