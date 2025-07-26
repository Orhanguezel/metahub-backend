import { Schema, model, Model, models, Types } from "mongoose";
import type { IGallery, IGalleryItem } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

const translatedFieldSchema = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<string, any>);

// ✅ Item schema
const galleryItemSchema = new Schema<IGalleryItem>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
    name: translatedFieldSchema,
    description: translatedFieldSchema,
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

// ✅ Main schema
const gallerySchema = new Schema<IGallery>(
  {
    images: [galleryItemSchema],
    category: {
      type: Schema.Types.ObjectId,
      ref: "gallerycategory",
      required: true,
    },
    tenant: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    isPublished: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

gallerySchema.index({ category: 1, isPublished: 1, isActive: 1 });

// ✅ Model
const Gallery: Model<IGallery> =
  models.gallery || model<IGallery>("gallery", gallerySchema);

// ✅ Export
export { Gallery };
