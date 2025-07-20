// types/section.ts
import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface ISectionMeta {
  tenant: string;
  key: string;                    // unique (örn: "about", "hero", "blog")
  label: TranslatedLabel;         // Çoklu dil zorunlu
  description?: TranslatedLabel;  // Çoklu dil
  icon: string;                   // Örn: "MdViewModule" (global default)
  variant?: string;               // Özel bileşen tipi/versiyon (örn: "slider", "classic" vs.)
  required?: boolean;             // Tüm tenantlarda zorunlu mu?
  defaultOrder: number;           // Varsayılan sırası
  defaultEnabled: boolean;        // Varsayılan aktiflik
  params?: Record<string, any>;   // Section'a özel parametreler
  createdAt?: Date;
  updatedAt?: Date;
}


export interface ISectionSetting {
  tenant: string;
  sectionKey: string;             // FK: SectionMeta.key
  enabled?: boolean;              // Tenant için aktif/pasif
  order?: number;                 // Tenant için sıra
  label?: TranslatedLabel;        // (override etmek isterse)
  description?: TranslatedLabel;  // (override)
  variant?: string;               // (tenant kendi varyantını seçebilir)
  params?: Record<string, any>;   // Tenant’a özel parametre
  roles?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

