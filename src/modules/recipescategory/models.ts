import mongoose, { Schema, Model, models } from "mongoose";
import slugify from "slugify";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type { IRecipeCategory } from "./types";

// Çok dilli name alanını dinamik oluştur
const nameFields = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<SupportedLocale, any>);

const RecipeCategorySchema = new Schema<IRecipeCategory>(
  {
    name: { type: Object, required: true, default: () => nameFields },
    tenant: { type: String, required: true, index: true, trim: true },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, min: 0, max: 100000, index: true },
  },
  { timestamps: true }
);

// Benzersizlik: tenant+slug
RecipeCategorySchema.index({ tenant: 1, slug: 1 }, { unique: true });

// Slug üretimi
RecipeCategorySchema.pre("validate", function (next) {
  const doc: any = this;
  if (!doc.slug) {
    const firstValidName =
      Object.values(doc.name || {}).find((val: any) => typeof val === "string" && val.trim()) || "category";
    doc.slug = slugify(String(firstValidName), { lower: true, strict: true });
  } else {
    doc.slug = slugify(String(doc.slug), { lower: true, strict: true });
  }
  next();
});

const RecipeCategory: Model<IRecipeCategory> =
  (models.recipecategory as Model<IRecipeCategory>) ||
  mongoose.model<IRecipeCategory>("recipecategory", RecipeCategorySchema);

export { RecipeCategory };
