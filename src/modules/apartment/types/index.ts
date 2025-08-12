import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

/** Görseller */
export interface IApartmentImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

/** Adres & Geo */
export interface IAddress {
  street?: string;
  number?: string;
  district?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;         // ISO-2 (DE/TR/…)
  fullText?: string;       // "Hansaring 12, 53111 Bonn, DE"
}

export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

/** Sorumlu kişi snapshot + referanslar (opsiyonel bağlar) */
export interface IContactPerson {
  customerRef?: Types.ObjectId; // ref: "customer"
  userRef?: Types.ObjectId;     // ref: "user"
  name: string;                 // zorunlu (snapshot)
  phone?: string;
  email?: string;
  role?: string;
}

/** Apartment (yalın/master data) */
export interface IApartment {
  _id?: Types.ObjectId;

  // İçerik
  title?: TranslatedLabel;
  content?: TranslatedLabel;
  images: IApartmentImage[];         // en az 1 görsel UI ile zorunlu

  // Multi-tenant & URL
  tenant: string;                    // zorunlu
  slug: string;                      // zorunlu, unique(tenant+slug)

  // Konum
  address: IAddress;                 // zorunlu
  location?: IGeoPoint;              // GeoJSON

  // Sınıflandırma
  category: Types.ObjectId;          // ref: "apartmentcategory" (zorunlu)

  // İlişkiler
  customer?: Types.ObjectId;         // ref: "customer" (opsiyonel)
  contact: IContactPerson;           // min: { name }

  // Yayın & durum
  isPublished: boolean;
  publishedAt?: Date;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
