// /modules/blog/types/index.ts

import type { SupportedLocale, TranslatedLabel } from "@/types/common";
import type { Types } from "mongoose";

export interface IBlogImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IBlog {
  title: TranslatedLabel;
  tenant: string; // Optional tenant field for multi-tenancy
  slug: string;
  summary: TranslatedLabel;
  content: TranslatedLabel;
  images: IBlogImage[];
  tags: string[];
  author?: string;
  category?: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  comments: Types.ObjectId[];
  isActive: boolean; // Soft delete
  createdAt: Date;
  updatedAt: Date;
}

