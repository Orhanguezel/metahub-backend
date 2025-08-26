import { Schema, model, Model, models } from "mongoose";
import type { ICoupon, ICouponImage } from "./types";

const CouponImageSchema = new Schema<ICouponImage>(
  {
    url: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: false }
);

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, uppercase: true, trim: true }, // unique kaldırıldı
    tenant: { type: String, required: true, index: true, trim: true },
    // Map kullanıyoruz ama toJSON'da objeye çevireceğiz
    title: { type: Map, of: String, required: true, default: {} },
    description: { type: Map, of: String, required: true, default: {} },
    images: { type: [CouponImageSchema], default: [] },
    discount: { type: Number, required: true, min: 1, max: 100 },
    expiresAt: { type: Date, required: true },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Tenant+code benzersizliği (çok kiracılı mimari)
couponSchema.index({ tenant: 1, code: 1 }, { unique: true });

// Map -> plain object (API yanıtlarını sadeleştirir)
couponSchema.set("toJSON", {
  transform: (_doc, ret) => {
    if (ret?.title instanceof Map) ret.title = Object.fromEntries(ret.title);
    if (ret?.description instanceof Map) ret.description = Object.fromEntries(ret.description);
    return ret;
  },
});

// Güvenli fallback kod üretimi
couponSchema.pre("save", function (next) {
  if (!this.code) this.code = `COUPON_${Date.now()}`;
  next();
});

const Coupon: Model<ICoupon> = models.coupon || model<ICoupon>("coupon", couponSchema);
export { Coupon };
export default Coupon;
