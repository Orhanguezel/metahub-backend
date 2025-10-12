import type { Types, Document } from "mongoose";

/** Liste sıralama seçenekleri */
export type VariantSort =
  | "created_desc"
  | "created_asc"
  | "price_asc"
  | "price_desc"
  | "stock_desc"
  | "stock_asc"
  | "sku_asc"
  | "sku_desc";

/** Create payload (API) */
export interface VariantCreateInput {
  product: string;                     // ObjectId (string)
  sku: string;                         // upper-case normalize
  barcode?: string;
  /** Örn: {"COLOR":"Black","SIZE":"M"} */
  options?: Record<string, string>;
  /** Para birimi başına fiyat – Product ile aynı tip: number */
  price: number;                       // required
  salePrice?: number;                  // optional (indirimli)
  currency?: string;                   // ISO 4217, default: TRY (upper-case)
  stock?: number;                      // default 0
  image?: string;
  isActive?: boolean;                  // default true
}

/** Update payload (API) */
export interface VariantUpdateInput extends Partial<VariantCreateInput> {}

/** Listeleme filtresi (Admin & Public) */
export interface VariantListQuery {
  product?: string;
  q?: string;                          // sku/barcode search (i)
  isActive?: boolean;
  currency?: string;
  min_price?: number;
  max_price?: number;
  min_stock?: number;
  max_stock?: number;
  limit?: number;                      // default 200
  sort?: VariantSort;                  // default created_desc
}

/** Opsiyonlardan variant çözme */
export interface VariantResolveInput {
  product: string;                     // ObjectId
  options: Record<string, string>;     // {"COLOR":"Black","SIZE":"M"}
}

/* ------- DB Tipi ------- */
export interface IProductVariant extends Document {
  tenant: string;                      // required, indexed
  product: Types.ObjectId;             // ref: product, indexed

  sku: string;                         // unique in tenant (UPPER)
  barcode?: string;                    // quick search

  /** Orijinal-case tutar (UI için), eşsizliği optionsKey sağlar */
  options: Map<string, string>;
  /** Normalized anahtar: "COLOR=BLACK|SIZE=M" (UNIQUE per product+tenant) */
  optionsKey: string;

  price: number;                       // required
  salePrice?: number;
  currency: string;                    // ISO 4217 UPPER, default TRY
  stock: number;                       // default 0
  image?: string;
  isActive: boolean;                   // default true

  createdAt?: Date;
  updatedAt?: Date;
}
