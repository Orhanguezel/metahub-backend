import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface INewsImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface INews {
  title: TranslatedLabel;
  tenant: string;
  slug: string;
  summary: TranslatedLabel;
  content: TranslatedLabel;
  images: INewsImage[];
  tags: string[];
  author?: string;
  category: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  comments: Types.ObjectId[];
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
