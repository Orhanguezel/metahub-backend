import type { Types } from "mongoose";

export type SearchDocType = "product" | "brand" | "category" | "content";

export interface ISearchIndex {
  _id?: Types.ObjectId;
  tenant: string;

  /** Kaynak belge bilgisi (projeksiyon) */
  ref: {
    collection: string;               // "product" | "brand" | ...
    id: Types.ObjectId;               // kaynak _id
  };

  type: SearchDocType;                // hızlı filtre
  slug?: string;
  title: Record<string, string>;      // i18n (Map → JSON’da objeye çevrilecek)
  subtitle?: Record<string, string>;  // i18n
  keywords?: string[];                // ilave anahtar kelimeler
  image?: string;

  /** Ürün odaklı opsiyonel alanlar */
  price_cents?: number;
  offer_price_cents?: number;
  currency?: string;
  brand?: { id?: Types.ObjectId; name?: string };
  category?: { id?: Types.ObjectId; path?: string[]; name?: string };

  /** Arama alanları */
  searchable: string;                 // normalize edilmiş birleştirilmiş metin
  boost?: number;                     // 1..n (sıralama ağırlığı)
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
