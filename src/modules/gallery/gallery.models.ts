import { Schema, model, Model, models, Types } from "mongoose";
import type { IGalleryItem,IGallerySubItem} from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

const translatedFieldSchema = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<string, any>);





// ✅ SubItem schema
const gallerySubItemSchema = new Schema<IGallerySubItem>(
  {
    image: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    title: translatedFieldSchema,
    description: translatedFieldSchema,
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

// ✅ Main schema
const gallerySchema = new Schema<IGalleryItem>(
  {
    items: [gallerySubItemSchema],
    category: {
      type: Schema.Types.ObjectId,
      ref: "GalleryCategory",
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
const Gallery: Model<IGalleryItem> =
  models.Gallery || model<IGalleryItem>("Gallery", gallerySchema);

// ✅ Export
export { Gallery };
