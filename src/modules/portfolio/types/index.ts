import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface IPortfolioImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IPortfolio {
  title: TranslatedLabel;
  tenant: string;
  slug: string;
  summary: TranslatedLabel;
  content: TranslatedLabel;
  images: IPortfolioImage[];
  tags: string[];
  author?: string;
  category?: string;
  isPublished: boolean;
  publishedAt?: Date;
  comments: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
