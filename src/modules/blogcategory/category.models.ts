import mongoose, { Schema, Types, Model, models } from "mongoose";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { IBlogCategory } from "./types";

// name alanını dinamik olarak oluştur
const nameFields = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, required: true, trim: true };
  return acc;
}, {} as Record<SupportedLocale, any>);

const BlogCategorySchema = new Schema<IBlogCategory>(
  {
    name: nameFields,
    tenant: {
      type: String,
      required: true,
      index: true,
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

BlogCategorySchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    const firstValidName =
      Object.values(this.name).find(
        (val) => typeof val === "string" && val.trim()
      ) || "";
    this.slug = firstValidName
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

const BlogCategory: Model<IBlogCategory> =
  (models.blogcategory as Model<IBlogCategory>) ||
  mongoose.model<IBlogCategory>("blogcategory", BlogCategorySchema);

export { BlogCategory };
