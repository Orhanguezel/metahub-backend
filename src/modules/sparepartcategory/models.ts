import mongoose, { Schema, Model, models } from "mongoose";
import type { ISparepartCategory, ICategoryImage } from "./types";
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

const SparepartCategorySchema = new Schema<ISparepartCategory>(
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

SparepartCategorySchema.pre("validate", function (next) {
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

const SparepartCategory: Model<ISparepartCategory> =
  models.sparepartcategory ||
  mongoose.model<ISparepartCategory>(
    "sparepartcategory",
    SparepartCategorySchema
  );

export { SparepartCategory };
