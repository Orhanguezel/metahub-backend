import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

/** Çok dilli metin */
export type TranslatedLabel = Partial<Record<SupportedLocale, string>>;

export interface ICategoryImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface ICategoryAncestor {
  _id: Types.ObjectId;          // parent _id
  slug: string;                 // parent için seçilen kanonik/locale slug (string)
  name: TranslatedLabel;        // parent adı (i18n)
}

export interface ICategory extends Document {
  // Çok-tenant
  tenant: string;                           // required

  // Zorunlu
  name: TranslatedLabel;                    // required (i18n)
  slug: TranslatedLabel;                    // required (i18n)
  slugLower: TranslatedLabel;               // auto (i18n, lowercase)

  // Opsiyonel (spec + mevcut standart)
  parentId?: Types.ObjectId | null;         // ref: category (alias: parent)
  image?: string;                           // tekil görsel (opsiyonel)
  icon?: string;
  banner?: string;
  order?: number;                           // sıralama
  status?: "active" | "draft" | "hidden";
  description?: TranslatedLabel;
  seoTitle?: TranslatedLabel;
  seoDescription?: TranslatedLabel;

  // Mevcut standart – DEĞİŞMEDİ
  images: ICategoryImage[];                 // çoklu görseller (korundu)

  // Hiyerarşi – otomatik
  ancestors: ICategoryAncestor[];           // root→…→parent
  depth: number;                            // root=0

  // Zaman damgaları
  createdAt?: Date;
  updatedAt?: Date;
}

/** FE için minimal kart */
export interface ShopoCategoryCard {
  id: string;
  title: string;   // FE uygun locale’den name[loc] seçecek
  slug: string;    // FE uygun locale’den slug[loc]/slugLower[loc] seçecek
  image: string;   // images[0]?.url veya image alanı
}
