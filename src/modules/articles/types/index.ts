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
  _id: Types.ObjectId | string;
  title: TranslatedLabel;
  tenant: string;
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
