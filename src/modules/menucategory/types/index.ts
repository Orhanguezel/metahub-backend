import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export interface IMenuCategoryImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IMenuCategory {
  _id?: Types.ObjectId;

  tenant: string;
  code: string;                       // business key (tenant+code unique)
  slug: string;                       // url-safe (auto üretim)
  name: TranslatedLabel;              // i18n zorunlu (en az bir dil)
  description?: TranslatedLabel;

  images: IMenuCategoryImage[];       // opsiyonel görsel listesi
  order?: number;                     // sıralama (küçük -> üstte)

  isPublished: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
