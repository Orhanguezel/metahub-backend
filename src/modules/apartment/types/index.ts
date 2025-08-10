import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

// i18n text
export type TranslatedLabel = { [key in SupportedLocale]?: string };

// --- Images ---
export interface IApartmentImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

// --- Address & Geo ---
export interface IAddress {
  street?: string;
  number?: string;
  district?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;   // ISO-2 (DE/TR/…)
  fullText?: string; // "Hansaring 12, 53111 Bonn, DE"
}

export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

// --- Contact (Responsible) ---
// Not: İster doğrudan snapshot (name/phone/e-mail) kullan, ister Customer'a bağla.
export interface IContactPerson {
  customerRef?: Types.ObjectId; // ref: "customer" (opsiyonel)
  userRef?: Types.ObjectId;     // ref: "user" (opsiyonel)
  name: string;                 // zorunlu: anlık isim snapshot
  phone?: string;
  email?: string;
  role?: string;                // "Hausmeister", "Yönetici" vb.
}

// --- Service assignment & fees ---
export type PeriodUnit = "day" | "week" | "month";
export type FeePeriod  = "once" | "weekly" | "monthly" | "quarterly" | "yearly";

// "services" koleksiyonuna referans
export interface IServiceAssignment {
  service: Types.ObjectId;           // ref: "services" (zorunlu)
  name?: TranslatedLabel;            // snapshot (i18n)
  priceSnapshot?: number;            // opsiyonel: o anki fiyatı kilitle
  durationMinutesSnapshot?: number;  // opsiyonel: "services.durationMinutes"
  period: {
    every: number;                   // 1,2,3...
    unit: PeriodUnit;                // day|week|month
    daysOfWeek?: number[];           // 0..6 (opsiyonel, haftalık plan)
  };
  lastPerformedAt?: Date;
  nextPlannedAt?: Date;
  isActive: boolean;
  notes?: TranslatedLabel;
}

export interface IFee {
  type: "dues" | "cleaning" | "security" | "trash" | "custom";
  label?: TranslatedLabel;
  amount: number;
  currency: string;                  // "EUR", "TRY"...
  period: FeePeriod;
  validFrom?: Date;
  validTo?: Date;
  isActive: boolean;
}



// --- Apartment ---
export interface IApartment {
  _id?: Types.ObjectId;

  // Content
  title?: TranslatedLabel;
  content?: TranslatedLabel;
  images: IApartmentImage[];         // en az 1 görsel önerilir

  // Multi-tenant & URL
  tenant: string;                    // zorunlu
  slug: string;                      // zorunlu, unique(tenant+slug)

  // Location
  address: IAddress;                 // zorunlu
  location?: IGeoPoint;              // GeoJSON (harita)

  // Category (mah/ilçe vb.)
  category: Types.ObjectId;          // ref: "apartmentcategory" (zorunlu)

  // İlgili müşteri (bina yöneticisi/işveren) opsiyonel
  customer?: Types.ObjectId;         // ref: "customer" (opsiyonel)
  // Sorumlu kişi snapshot + referanslar
  contact: IContactPerson;           // min: { name }

  // Services & fees
  services: IServiceAssignment[];    // çoklu servis + periyot
  fees?: IFee[];                     // aidat/diğer kalemler

  // Publish & status
  isPublished: boolean;
  publishedAt?: Date;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
