import { Schema, model, Document } from "mongoose";

export interface IGalleryItem extends Document {
  title?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  image: string[];
  type: "image" | "video";
  isPublished: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const gallerySchema = new Schema<IGalleryItem>(
  {
    title: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    image: [{ type: String, required: true }],
    type: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    isPublished: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model<IGalleryItem>("Gallery", gallerySchema);
