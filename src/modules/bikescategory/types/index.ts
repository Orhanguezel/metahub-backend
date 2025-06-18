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

export interface IBikeCategory extends Document {
  name: TranslatedLabel;
  description: TranslatedLabel;
  slug: string;
  images: ICategoryImage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
