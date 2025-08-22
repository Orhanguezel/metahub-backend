import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

// Çoklu dil etiket
export type TranslatedLabel = { [key in SupportedLocale]: string };

// Görsel dosya
export interface ILibraryImage {
  _id?: Types.ObjectId;           // alt doküman id (sıralama/silme için)
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

// Genel dosya (pdf, docx, xlsx vs.)
export interface ILibraryFile {
  _id?: Types.ObjectId;           // opsiyonel
  url: string;
  name: string;
  size?: number;
  type?: string;
  publicId?: string;
}

export interface ILibrary {
  title: TranslatedLabel;
  tenant: string;
  slug: string;
  summary?: TranslatedLabel;
  content: TranslatedLabel;
  images?: ILibraryImage[];
  files?: ILibraryFile[];
  tags?: string[];
  author?: string;
  category: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  comments: Types.ObjectId[];
  isActive: boolean;
  views: number;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}
