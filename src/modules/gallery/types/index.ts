import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]: string };

// ✅ SubItem interface
export interface IGallerySubItem {
  image: string;
  thumbnail: string;
  webp?: string;
   title: { [key in SupportedLocale]: string };
  description: { [key in SupportedLocale]: string };
  order?: number;
}

// ✅ Main Item interface
export interface IGalleryItem {
  items: IGallerySubItem[];
  tenant: string; 
  category: Types.ObjectId;
  type: "image" | "video";
  isPublished: boolean;
  isActive: boolean;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}