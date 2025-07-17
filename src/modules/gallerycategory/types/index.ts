import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

// 🌐 Çok dilli etiket tipi
export type TranslatedLabel = {
  [key in SupportedLocale]: string;
};

export interface ICategoryImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IGalleryCategory extends Document {
  name: TranslatedLabel;
  tenant: string; // Optional tenant field for multi-tenancy
  description: TranslatedLabel;
  slug: string;
  images: ICategoryImage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
