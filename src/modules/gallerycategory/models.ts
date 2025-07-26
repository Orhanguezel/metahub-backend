import mongoose, { Schema, Model, models } from "mongoose";
import type { IGalleryCategory, ICategoryImage } from "./types";
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

const GalleryCategorySchema = new Schema<IGalleryCategory>(
  {
    name: localizedStringField(),
    description: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    images: { type: [CategoryImageSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

GalleryCategorySchema.pre("validate", function (next) {
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

const GalleryCategory: Model<IGalleryCategory> =
  models.gallerycategory ||
  mongoose.model<IGalleryCategory>("gallerycategory", GalleryCategorySchema);

export { GalleryCategory };
