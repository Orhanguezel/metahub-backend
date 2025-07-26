import mongoose, { Schema, Types, Model, models } from "mongoose";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { ITeamCategory } from "./types";

// name alanını dinamik olarak oluştur
const nameFields = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, required: true, trim: true };
  return acc;
}, {} as Record<SupportedLocale, any>);

const TeamCategorySchema = new Schema<ITeamCategory>(
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

TeamCategorySchema.pre("validate", function (next) {
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

const TeamCategory: Model<ITeamCategory> =
  (models.teamcategory as Model<ITeamCategory>) ||
  mongoose.model<ITeamCategory>("teamcategory", TeamCategorySchema);

export { TeamCategory };
