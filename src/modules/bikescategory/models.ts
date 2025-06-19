// models/BikeCategory.ts
import mongoose, { Schema, Model, models } from "mongoose";
import type { IBikeCategory, ICategoryImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Çok dilli metin alanı
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

const CategoryImageSchema = new Schema<ICategoryImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const BikeCategorySchema = new Schema<IBikeCategory>(
  {
    name: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    description: localizedStringField(),
    slug: { type: String, required: true, unique: true, lowercase: true },
    images: { type: [CategoryImageSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BikeCategorySchema.pre("validate", function (next) {
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

const BikeCategory: Model<IBikeCategory> =
  models.BikeCategory || mongoose.model<IBikeCategory>("BikeCategory", BikeCategorySchema);

export { BikeCategory };
