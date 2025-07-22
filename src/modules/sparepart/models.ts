import { Schema, Model, models, model, Types } from "mongoose";
import { SUPPORTED_LOCALES } from "@/types/common";
import type { ISparepart, ISparepartImage } from "@/modules/sparepart/types";

const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

const SparepartImageSchema = new Schema<ISparepartImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const SparepartSchema = new Schema<ISparepart>(
  {
    name: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: localizedStringField(),
    brand: { type: String, required: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "SparepartCategory",
      required: true,
    },
    tags: [{ type: String, trim: true }],
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0 },
    stockThreshold: { type: Number, default: 5 },
    images: { type: [SparepartImageSchema], required: true, default: [] },

    // Teknik özellikler (opsiyonel)
    material: { type: String },
    color: [{ type: String }],
    weightKg: { type: Number },
    size: { type: String },
    powerW: { type: Number },
    voltageV: { type: Number },
    flowRateM3H: { type: Number },
    coolingCapacityKw: { type: Number },

    // Elektrik özellikleri
    isElectric: { type: Boolean, required: true, default: false },
    batteryRangeKm: { type: Number },
    motorPowerW: { type: Number },

    // Diğer
    isActive: { type: Boolean, required: true, default: true },
    isPublished: { type: Boolean, required: true, default: false },
    likes: { type: Number, required: true, default: 0 },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
  },
  { timestamps: true }
);

SparepartSchema.pre("validate", function (next) {
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

const Sparepart: Model<ISparepart> =
  models.Sparepart || model<ISparepart>("Sparepart", SparepartSchema);
export { Sparepart };
