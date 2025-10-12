// src/modules/product/types/index.ts

import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

/** Çok dilli metin alanı */
export type TranslatedLabel = Partial<Record<SupportedLocale, string>>;
/** Çok dilli string[] (örn. tags, seoKeywords) */
export type TranslatedStringArray = Partial<Record<SupportedLocale, string[]>>;

/** Görsel */
export interface IProductImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

/** Boyutlar */
export interface IProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: string; // "cm", "mm", "in"...
}

/** Seçenek tanımı (ürün bazlı, vitrin amaçlı) */
export interface IProductOption {
  name: TranslatedLabel;         // Örn. "Color"
  values: TranslatedStringArray; // Örn. { tr:["Kırmızı","Mavi"], en:["Red","Blue"] }
  key?: string;                  // Sistem içi anahtar (ops.)
}

/** Ürün */
export interface IProduct extends Document {
  // Multi-tenant
  tenant: string;                              // **Zorunlu**

  // Spec: REQUIRED
  title: TranslatedLabel;                      // **Zorunlu**, i18n
  slug: TranslatedLabel;                       // **Zorunlu**, i18n
  slugLower?: TranslatedLabel;                 // (auto) i18n lower-case, unique per tenant+locale
  slugCanonical: string;                       // **Zorunlu** (tenant+unique), auto
  price: number;                               // **Zorunlu**
  images: IProductImage[];                     // **Zorunlu**
  categoryId: Types.ObjectId;                  // **Zorunlu**, ref: category

  /** İlişkiler (opsiyonel) */
  sellerId?: Types.ObjectId | null;            // ref: seller  ⬅️ yeni, opsiyonel

  // Spec: OPTIONAL
  sku?: string;
  shortDescription?: TranslatedLabel;
  description?: TranslatedLabel;
  brandId?: Types.ObjectId;                    // ref: brand
  rating?: number;
  reviewCount?: number;
  stock?: number;
  badges?: string[];
  salePrice?: number;
  discountPercent?: number;
  status?: "active" | "draft" | "archived" | "hidden";
  tags?: TranslatedStringArray;
  videoUrl?: string;
  gallery?: IProductImage[];

  /** İlişkiler */
  attributes?: Types.ObjectId[];               // ref: productattribute
  variants?: Types.ObjectId[];                 // ref: productvariant
  options?: IProductOption[];                  // vitrin/FE için i18n seçenekler (ops.)

  shippingClass?: string;
  taxClass?: string;
  barcode?: string;

  weight?: number;
  dimensions?: IProductDimensions;

  minPurchaseQty?: number;
  maxPurchaseQty?: number;

  visibility?: "public" | "private" | "hidden" | "draft";

  seoTitle?: TranslatedLabel;
  seoDescription?: TranslatedLabel;
  seoKeywords?: TranslatedStringArray;

  createdAt?: Date;
  updatedAt?: Date;
}
