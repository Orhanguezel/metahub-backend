import { Schema, model, Document } from "mongoose";

export interface IGalleryItem extends Document {
  title?: string;
  image: string[];
  type: "image" | "video";
  isPublished: boolean;
  isActive: boolean;
  language?: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const gallerySchema = new Schema<IGalleryItem>(
  {
    title: { type: String, trim: true },
    image: [{ type: String, required: true }],
    type: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    isPublished: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
  },
  { timestamps: true }
);

export default model<IGalleryItem>("Gallery", gallerySchema);
