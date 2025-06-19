import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface IArticlesImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IArticles {
  title: TranslatedLabel;
  tenant: string; // Optional tenant field for multi-tenancy
  slug: string;
  summary: TranslatedLabel;
  content: TranslatedLabel;
  images: IArticlesImage[];
  tags: string[];
  author?: string;
  category: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  comments: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
