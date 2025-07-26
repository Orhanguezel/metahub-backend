import { Schema, Model, Types, models, model } from "mongoose";
import type { IBike, IBikeImage } from "@/modules/bikes/types";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🔤 Çok dilli alan tipi tanımı
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

// ✅ Image schema
const BikeImageSchema = new Schema<IBikeImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

// ✅ Main schema
const BikeSchema = new Schema<IBike>(
  {
    name: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: localizedStringField(),
    brand: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0 },
    stockThreshold: { type: Number, default: 5 },
    category: {
      type: Schema.Types.ObjectId,
      ref: "bikecategory",
      required: true,
    },
    tags: [{ type: String }],
    images: { type: [BikeImageSchema], default: [] },
    frameMaterial: { type: String },
    brakeType: { type: String },
    wheelSize: { type: Number },
    gearCount: { type: Number },
    suspensionType: { type: String },
    color: [{ type: String }],
    weightKg: { type: Number },
    isElectric: { type: Boolean, default: false },
    batteryRangeKm: { type: Number },
    motorPowerW: { type: Number },
    comments: [{ type: Schema.Types.ObjectId, ref: "comment" }],
    likes: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Slug middleware (i18n key'li loglama için destekli hale getirilecek controller'da)
BikeSchema.pre("validate", function (next) {
  if (!this.slug && this.name?.en) {
    this.slug = this.name.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

const Bike: Model<IBike> = models.bike || model<IBike>("bike", BikeSchema);
export { Bike };
