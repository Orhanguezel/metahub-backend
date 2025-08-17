import { Schema, Model, models, model } from "mongoose";
import type { IGallery, IGalleryImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/* Helpers */
const localized = () => {
  const fields: Record<string, any> = {};
  for (const l of SUPPORTED_LOCALES) fields[l] = { type: String, trim: true, default: "" };
  return fields;
};

/* Subdoc: image */
const GalleryImageSchema = new Schema<IGalleryImage>(
  {
    url: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: true } // V2: subdoc id açık
);

/* Main */
const GallerySchema = new Schema<IGallery>(
  {
    type: { type: String, enum: ["image", "video"], required: true, index: true },
    title: localized(),
    tenant: { type: String, required: true, index: true, trim: true },
    summary: localized(),
    content: localized(),
    slug: { type: String, required: true, lowercase: true, trim: true },
    images: { type: [GalleryImageSchema], default: [] },
    tags: {
      type: [String],
      default: [],
      set: (arr: string[]) =>
        [...new Set((arr || []).map((s) => String(s).trim()).filter(Boolean))],
    },
    author: { type: String, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "gallerycategory", required: true },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    comments: { type: [Schema.Types.ObjectId], ref: "comment", default: [] },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true, minimize: false }
);

/* Indexes */
GallerySchema.index({ tenant: 1, slug: 1 }, { unique: true });
GallerySchema.index({ tenant: 1, createdAt: -1 });

/* Hooks */
GallerySchema.pre("validate", function (next) {
  if (!Array.isArray(this.images)) this.images = [];
  if (!Array.isArray(this.tags)) this.tags = [];
  if (!Array.isArray(this.comments)) this.comments = [];

  if (!this.slug) {
    const first =
      (this.title as any)?.tr ||
      (this.title as any)?.en ||
      Object.values((this.title as any) || {})[0] ||
      "gallery";
    this.slug = String(first)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

GallerySchema.pre("save", function (next) {
  if (this.isModified("isPublished")) {
    if (this.isPublished && !this.publishedAt) this.publishedAt = new Date();
    if (!this.isPublished) this.publishedAt = undefined;
  }
  next();
});

export const Gallery: Model<IGallery> =
  models.gallery || model<IGallery>("gallery", GallerySchema);

export default Gallery;
