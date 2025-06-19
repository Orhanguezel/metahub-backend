import { Schema, model, Model, models, Types } from "mongoose";
import { GalleryCategory } from "@/modules/gallerycategory";

// ✅ SubItem interface
interface IGallerySubItem {
  image: string;
  thumbnail: string;
  webp?: string;
  title?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  tenant: string; // Optional tenant field for multi-tenancy
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  order?: number;
}

// ✅ Main Item interface
export interface IGalleryItem {
  items: IGallerySubItem[];
  tenant: string; // Optional tenant field for multi-tenancy
  category: Types.ObjectId;
  type: "image" | "video";
  isPublished: boolean;
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ SubItem schema
const gallerySubItemSchema = new Schema<IGallerySubItem>(
  {
    image: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    title: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    tenant: { type: String, required: true, index: true },
    description: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
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
