import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

/** Çok dilli (zorunlu olmayan) string alan */
export type TranslatedOptional = Partial<Record<SupportedLocale, string>>;

/** Var olan tip (değiştirmiyoruz) */
export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface IAboutImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

/**
 * 🔁 Sadece slug kısmını çok dilli hale getirdik.
 * - slug: kullanıcıya görünen slug (locale->string)
 * - slugLower: case-insensitive arama ve benzersizlik için
 */
export interface IAbout {
  title: TranslatedLabel;
  tenant: string;

  slug: TranslatedOptional;                      // ← ÇOK DİLLİ
  slugLower?: TranslatedOptional;                // ← indeksleme için

  summary: TranslatedLabel;
  content: TranslatedLabel;
  images: IAboutImage[];
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
