import type { Types } from "mongoose";

/** Bölge tanımı (vergi/kargo zonları) */
export interface IGeoZone {
  tenant: string;
  name: string;
  countries?: string[];     // ISO-3166-1 alpha-2 (TR, DE, US)
  states?: string[];        // TR-34, US-CA ...
  postalCodes?: string[];   // wildcard/regex'i string olarak tutabilirsiniz
  createdAt?: Date;
  updatedAt?: Date;
}

/** Vergi oranı */
export interface ITaxRate {
  tenant: string;
  name: string;                 // "KDV 20"
  zone?: Types.ObjectId | null; // ref: geozone
  rate: number;                 // 0..1 (örn 0.20)
  inclusive?: boolean;          // fiyat vergi dahil mi?
  priority?: number;            // birden çok kuralda sıralama
  productClasses?: string[];    // "standard","reduced","books"...
  isActive?: boolean;
  startAt?: Date;               // opsiyonel zaman penceresi
  endAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Address benzeri payload (resolver için) */
export type AddressLike = {
  country?: string;
  state?: string;
  city?: string;
  postal?: string;
};
