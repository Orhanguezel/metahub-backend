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
  country: string;          // ISO-2 (DE/TR/…)
  fullText?: string;
}

export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

/** Konumsal referanslar (normalize) */
export interface IPlaceRefs {
  neighborhood?: Types.ObjectId;  // ref: "neighborhood"
  cityCode?: string;
  districtCode?: string;
  zip?: string;
}

/** Snapshot’lar (listeyi zenginleştirmek için) */
export interface IApartmentSnapshots {
  neighborhoodName?: TranslatedLabel;
  managerName?: string;                    // yeni (opsiyonel)
  serviceNames?: TranslatedLabel[];        // yeni (opsiyonel)
  lastPriceLabel?: string;                 // yeni (opsiyonel) — "€120 / Aylık" gibi
}

/** YÖNETİCİ snapshot (userRef kaldırıldı) */
export interface IContactPerson {
  customerRef?: Types.ObjectId; // ref: "customer"
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

/* ===== Ops bağları ===== */
export interface IServiceBinding {
  service: Types.ObjectId;             // ref: "servicecatalog"
  schedulePlan?: Types.ObjectId;       // ref: "scheduleplan"
  operationTemplate?: Types.ObjectId;  // ref: "operationtemplate"
  priceListItem?: Types.ObjectId;      // ref: "pricelistitem"
  isActive?: boolean;
  notes?: string;
}

export interface IApartmentOpsNotifyPrefs {
  managerOnJobCompleted?: boolean;
  managerOnJobAssigned?: boolean;
  employeeOnJobAssigned?: boolean;
}

export interface IApartmentOps {
  employees: Types.ObjectId[];         // ref: "employee"
  supervisor?: Types.ObjectId;         // ref: "employee"
  services: IServiceBinding[];

  cleaningPlan?: Types.ObjectId;       // ref: "scheduleplan"
  trashPlan?: Types.ObjectId;          // ref: "scheduleplan"

  cashCollectionDay?: number;          // 1..31
  notify?: IApartmentOpsNotifyPrefs;
}

/* ===== Diğer modül linkleri (opsiyonel) ===== */
export interface IApartmentLinks {
  contracts?: Types.ObjectId[];
  billingPlans?: Types.ObjectId[];
  invoices?: Types.ObjectId[];
  payments?: Types.ObjectId[];
  priceLists?: Types.ObjectId[];
  operationJobs?: Types.ObjectId[];
  operationTemplates?: Types.ObjectId[];
  timeEntries?: Types.ObjectId[];
  reportDefs?: Types.ObjectId[];
  reportRuns?: Types.ObjectId[];
  files?: Types.ObjectId[];
  contacts?: Types.ObjectId[];
}

/** Apartment (master data) */
export interface IApartment {
  _id?: Types.ObjectId;

  // İçerik
  title?: TranslatedLabel;
  content?: TranslatedLabel;
  images: IApartmentImage[];

  // Multi-tenant & URL
  tenant: string;
  slug: string;

  // Konum
  address: IAddress;
  location?: IGeoPoint;
  place?: IPlaceRefs;
  snapshots?: IApartmentSnapshots;

  // İlişkiler
  customer?: Types.ObjectId;      // apartman yöneticisi (Customer)
  contact: IContactPerson;        // yöneticinin snapshot’ı

  // Operasyon & linkler
  ops?: IApartmentOps;
  links?: IApartmentLinks;

  // Yayın & durum
  isPublished: boolean;
  publishedAt?: Date;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
