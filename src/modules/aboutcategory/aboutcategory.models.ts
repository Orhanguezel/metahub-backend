import mongoose, { Schema, Types, Model, models } from "mongoose";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { IAboutCategory } from "./types";

// name alanını dinamik olarak oluştur
const nameFields = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, required: true, trim: true };
  return acc;
}, {} as Record<SupportedLocale, any>);

const AboutCategorySchema = new Schema<IAboutCategory>(
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

AboutCategorySchema.pre("validate", function (next) {
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

const AboutCategory: Model<IAboutCategory> =
  (models.AboutCategory as Model<IAboutCategory>) ||
  mongoose.model<IAboutCategory>("AboutCategory", AboutCategorySchema);

export { AboutCategory };
