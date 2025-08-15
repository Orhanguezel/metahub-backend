import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface IActivityImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IActivity {
  title: TranslatedLabel;
  tenant: string;
  slug: string;
  summary: TranslatedLabel;
  content: TranslatedLabel;
  images: IActivityImage[];
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
