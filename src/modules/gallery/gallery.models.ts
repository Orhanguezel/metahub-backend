import { Schema, model, Document, Model, models } from "mongoose";

// ✅ Category enum (daha merkezi ve temiz yönetim)
export enum GalleryCategory {
  Hero = "hero",
  About = "about",
  Products = "products",
  Testimonials = "testimonials",
  Team = "team"
}

// ✅ SubItem interface
export interface IGallerySubItem {
  image: string;
  thumbnail: string;
  webp?: string;
  title?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  order?: number;
}

// ✅ Main Item interface
export interface IGalleryItem  {
  items: IGallerySubItem[];
  category: GalleryCategory;
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
      type: String,
      enum: Object.values(GalleryCategory), 
      required: true,
    },
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

// ✅ Guarded model tanımı
const Gallery: Model<IGalleryItem> =
  models.Gallery || model<IGalleryItem>("Gallery", gallerySchema);

export default Gallery;
