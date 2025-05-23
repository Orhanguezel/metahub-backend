import mongoose, { Schema, model, models, Model } from "mongoose";

export interface IActivityCategory  {
  name: {
    tr: string;
    en: string;
    de: string;
  };
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


const ActivityCategorySchema = new Schema<IActivityCategory>(
  {
    name: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
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

ActivityCategorySchema.pre("validate", function (next) {
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


const ActivityCategory: Model<IActivityCategory> =
  models.ActivityCategory || model<IActivityCategory>("ActivityCategory", ActivityCategorySchema);

export { ActivityCategory };
