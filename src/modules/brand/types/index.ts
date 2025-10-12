// src/modules/brand/dto.ts
import type { SupportedLocale } from "@/types/common";

export type BrandStatus = "active" | "inactive";
export type I18nString = Partial<Record<SupportedLocale, string>>;
export type BrandImageKind = "logo" | "banner" | "other";

export interface BrandImageInput {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
  kind?: BrandImageKind; // logo | banner | other
}

/** CREATE: i18n + images destekli */
export interface CreateBrandInput {
  /** En az 1 dil zorunlu */
  name: I18nString;

  /** i18n veya tek-string (tüm dillere türetilir) */
  slug?: I18nString | string;

  /** i18n açıklama (ops.) */
  description?: I18nString;

  website?: string;
  order?: number;
  status?: BrandStatus;

  /** Standart görsel yapısı (ops.) */
  images?: BrandImageInput[];

  /** Geriye dönük uyumluluk (ops.) – images.kind ile aynalanabilir */
  logo?: string;
  banner?: string;
}

/** UPDATE: tüm alanlar opsiyonel; temizleme için null kabul edilenler belirtilmiştir */
export interface UpdateBrandInput {
  name?: I18nString;
  slug?: I18nString | string;
  description?: I18nString;

  website?: string;
  order?: number;
  status?: BrandStatus;

  images?: BrandImageInput[];

  /** Opsiyonel aynalar; null verilirse temizlenebilir */
  logo?: string | null;
  banner?: string | null;
}

export type BrandSort =
  | "order_asc"
  | "order_desc"
  | "created_desc"
  | "created_asc";

/** LIST: filtre & sıralama */
export interface BrandListQuery {
  status?: BrandStatus;
  /** slug veya name.<lang> alanında arama */
  q?: string;
  /** name.<lang> için hedef dil filtresi */
  lang?: SupportedLocale;
  /** default: 200 */
  limit?: number;
  sort?: BrandSort;
}
