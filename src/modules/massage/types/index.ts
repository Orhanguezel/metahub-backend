import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface IMassageImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IMassage {
  title: TranslatedLabel;
  tenant: string;
  slug: string;
  summary: TranslatedLabel;
  content: TranslatedLabel;
  images: IMassageImage[];
  tags: string[];
  author?: string;
  durationMinutes?: number; // Örnek: 30 dakika
  price?: number; // Örnek: 100.00
  category: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  comments: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
