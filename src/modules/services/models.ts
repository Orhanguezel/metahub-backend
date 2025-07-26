import { Schema, Model, Types, models, model } from "mongoose";
import type { IServices, IServicesImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🔤 Çok dilli alan tipi tanımı
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

const ServicesImageSchema = new Schema<IServicesImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const ServicesSchema = new Schema<IServices>(
  {
    title: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    summary: localizedStringField(),
    content: localizedStringField(),
    slug: { type: String, required: true, unique: true, lowercase: true },
    images: { type: [ServicesImageSchema], default: [] },
    tags: [{ type: String }],
    author: { type: String },
    category: {
      type: Schema.Types.ObjectId,
      ref: "servicescategory",
      required: true,
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: [{ type: Schema.Types.ObjectId, ref: "comment" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ServicesSchema.pre("validate", function (next) {
  if (!this.slug && this.title?.en) {
    this.slug = this.title.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

const Services: Model<IServices> =
  models.services || model<IServices>("services", ServicesSchema);

export { Services, ServicesImageSchema, ServicesSchema };
