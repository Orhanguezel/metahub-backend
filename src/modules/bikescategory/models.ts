import mongoose, { Schema, Model, models } from "mongoose";
import type { IBikeCategory } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Dinamik çok dilli alan: plain object
const TranslatedLabelSchema = new Schema(
  Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, { type: String, required: true, trim: true }])
  ),
  { _id: false, id: false }
);

const BikeCategorySchema = new Schema<IBikeCategory>(
  {
    name: {
      type: TranslatedLabelSchema,
      required: true,
      validate: {
        validator: function (obj: Record<string, string>) {
          return SUPPORTED_LOCALES.every((l) => obj[l] && obj[l].trim());
        },
        message: "All supported locales must be provided in name.",
      },
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Slug otomatik oluşturma
BikeCategorySchema.pre("validate", function (next) {
  // this: any çünkü mongoose instance’ı, tip güvenliği için 'as any' kullanılabilir
  const self = this as any;
  // (name.en) fallback, name['en'] ile her zaman güvenli erişirsin
  if (!self.slug && self.name && self.name.en) {
    self.slug = self.name.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

// Model export (guard)
const BikeCategory: Model<IBikeCategory> =
  (models.BikeCategory as Model<IBikeCategory>) ||
  mongoose.model<IBikeCategory>("BikeCategory", BikeCategorySchema);

export { BikeCategory };
