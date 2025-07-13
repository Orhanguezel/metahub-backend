import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]: string };

// ✅ SubItem interface
export interface IGalleryItem {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
  name: { [key in SupportedLocale]: string };
  description: { [key in SupportedLocale]: string };
  order?: number;
}

// ✅ Main Item interface
export interface IGallery {
  images: IGalleryItem[];
  tenant: string;
  category: Types.ObjectId;
  type: "image" | "video";
  isPublished: boolean;
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}
