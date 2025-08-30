import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export interface IMenuImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

/** Menü içindeki kategori bağları (sıra & featured) */
export interface IMenuCategoryRef {
  category: Types.ObjectId;      // ref: "menucategory"
  order?: number;                // 0..100000
  isFeatured?: boolean;
}

export interface IMenu {
  _id?: Types.ObjectId;

  tenant: string;
  code: string;                  // tenant + code unique
  slug: string;                  // url-safe (unique per tenant)

  /** Menünün genel görüntüleme sırası (küçük -> önce) */
  order?: number;                // 0..100000

  name: TranslatedLabel;         // en az bir dil dolu
  description?: TranslatedLabel;

  images: IMenuImage[];          // kapak görselleri (opsiyonel)

  branches?: Types.ObjectId[];   // ref: "branch" — bu menüyü kullanan şubeler
  categories: IMenuCategoryRef[]; // menüde gösterilen kategoriler ve sıraları

  effectiveFrom?: Date;          // yayın geçerlilik başlangıcı
  effectiveTo?: Date;            // yayın geçerlilik bitişi

  isPublished: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/* Örnek: başka yerlerde kullandığınız opsiyon tipi (değişmedi) */
export interface IMenuItemModifierOption {
  code: string;
  name: TranslatedLabel;
  order?: number;
  isDefault?: boolean;
  priceListItem?: Types.ObjectId; // ref: "pricelistitem" (kind="catalog")
}
