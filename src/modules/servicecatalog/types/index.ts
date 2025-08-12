import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]: string };

/** Görseller (services ile birebir aynı yapı) */
export interface IServiceCatalogImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

/** Service Catalog (ince model) */
export interface IServiceCatalog {
  _id?: Types.ObjectId;

  // Multi-tenant & kimlik
  tenant: string;                // required
  code: string;                  // required, tenant+code unique, UPPER_SNAKE

  // i18n
  name: TranslatedLabel;         // required (en az bir locale dolu olmalı)
  description?: TranslatedLabel; // optional

  // Operasyon varsayılanları
  defaultDurationMin: number;    // >= 1
  defaultTeamSize: number;       // >= 1

  // Opsiyonel öneri fiyat (kontrat fiyatı ayrı)
  suggestedPrice?: number;       // >= 0

  // Sınıflandırma & etiketler
  category?: Types.ObjectId;     // ref: "servicescategory"
  tags: string[];

  // Medya
  images: IServiceCatalogImage[]; // aynı image şeması

  // Durum
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
