import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export type ServiceType = "delivery" | "pickup" | "dinein";

export interface IMoney {
  amount: number;
  currency: "TRY" | "EUR" | "USD"; // default TRY
}

/** Adres & Geo */
export interface IAddress {
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string; // ISO-2 (DE/TR/…)
  fullText?: string;
}

export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

/** Çalışma Saatleri */
export interface IOpeningHour {
  day: number;      // 0-6 (Sun-Sat)
  open: string;     // "HH:mm"
  close: string;    // "HH:mm"
}

/** Teslimat Bölgesi (Polygon) + Ücret */
export interface IDeliveryZone {
  name?: string;
  polygon: {
    type: "Polygon";
    coordinates: number[][][]; // [[[lng,lat], [lng,lat], ...]]
  };
  fee?: IMoney; // default 0 TRY
}

export interface IBranch {
  _id?: Types.ObjectId;

  tenant: string;
  code: string;                      // benzersiz (tenant + code)
  name: TranslatedLabel;

  address?: IAddress;
  location: IGeoPoint;               // 2dsphere
  services: ServiceType[];           // en az 1
  openingHours?: IOpeningHour[];     // opsiyonel; belirtilmezse "her zaman açık" varsayımı yok
  minPrepMinutes?: number;           // min hazırlık süresi (dk)

  deliveryZones?: IDeliveryZone[];   // Faz 2’de kapsam genişler

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
