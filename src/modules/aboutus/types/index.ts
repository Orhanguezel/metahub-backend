import type { SupportedLocale, TranslatedLabel } from "@/types/common";
import type { Types } from "mongoose";

/** Çok dilli (opsiyonel) string alan */
export type TranslatedOptional = Partial<Record<SupportedLocale, string>>;
/** Çok dilli string dizisi (örn. tags) */
export type TranslatedStringArray = Partial<Record<SupportedLocale, string[]>>;

export interface IAboutusImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

/** Çok dilli slug + tags ile About içerik tipi */
export interface IAboutus {
  title: TranslatedLabel;
  tenant: string;

  slug?: TranslatedOptional;
  slugLower?: TranslatedOptional;

  summary: TranslatedLabel;
  content: TranslatedLabel;

  images: IAboutusImage[];
  tags: TranslatedStringArray;

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
