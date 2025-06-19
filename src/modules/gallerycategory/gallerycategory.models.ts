import mongoose, { Schema, model, models, Model } from "mongoose";

export interface IGalleryCategory  {
  name: {
    tr: string;
    en: string;
    de: string;
  };
  tenant: string; // Optional tenant field for multi-tenancy
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


const GalleryCategorySchema = new Schema<IGalleryCategory>(
  {
    name: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    tenant: { type: String, required: true, index: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

GalleryCategorySchema.pre("validate", function (next) {
  const base = this.name?.en || this.name?.tr || this.name?.de || "category";
  if (!this.slug && base) {
    this.slug = base
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});


const GalleryCategory: Model<IGalleryCategory> =
  models.GalleryCategory || model<IGalleryCategory>("GalleryCategory", GalleryCategorySchema);

export { GalleryCategory };
