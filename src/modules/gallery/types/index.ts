import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export interface IGalleryImage {
  _id?: string;           // subdoc id açık
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IGallery extends Document {
  type: "image" | "video";
  title: TranslatedLabel;
  tenant: string;
  slug: string;
  summary: TranslatedLabel;
  content: TranslatedLabel;
  images: IGalleryImage[];
  tags: string[];
  author?: string;
  category: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
