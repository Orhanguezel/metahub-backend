// src/modules/storefront/types.ts
import type { Types } from "mongoose";

/** Menü öğesi – esnek yapı (alt çocuklar destekli) */
export interface IMenuItem {
  key?: string;
  title?: string;
  url?: string;
  icon?: string;
  children?: IMenuItem[];
  isActive?: boolean;
  order?: number;
  [k: string]: any;
}

/** Banner öğesi – esnek + MediaAsset ilişkili */
export interface IBannerItem {
  key?: string;
  title?: string;
  subtitle?: string;

  /** İlişkili MediaAsset referansı (opsiyonel ama önerilir) */
  mediaId?: Types.ObjectId;

  /** Görsel (MediaAsset’ten türetilen denormalize alanlar) */
  image?: string;       // orijinal URL
  thumbnail?: string;   // küçük önizleme
  webp?: string;        // optimize URL (varsa)

  href?: string;
  position?: string;    // örn: "homepage.hero", "category.sidebar"
  isActive?: boolean;
  order?: number;

  meta?: { width?: number; height?: number; mime?: string };

  [k: string]: any;     // genişletme için serbest alan
}

/** Storefront ayarları */
export interface IStorefrontSettings {
  _id?: Types.ObjectId;

  tenant: string;

  currency: string;      // ISO 4217
  currencies?: string[];
  locale: string;        // BCP-47
  locales?: string[];

  priceIncludesTax?: boolean;
  measurement?: "metric" | "imperial";

  menus?: IMenuItem[];
  banners?: IBannerItem[];

  featuredCategories?: string[];
  featuredProducts?: string[];

  socials?: Record<string, string>;

  createdAt?: Date;
  updatedAt?: Date;
}

export type { IStorefrontSettings as default };
