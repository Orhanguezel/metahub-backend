import type { SupportedLocale, TranslatedLabel } from "@/types/common";

export type RouteMeta = {
  method: string;
  path: string;
  auth?: boolean;
  summary?: string;
  body?: any;
};

// types.ts
export interface IModuleMeta {
  name: string; // unique
  label: TranslatedLabel; // çoklu dil
  icon: string; // global default icon
  roles: string[]; // default global yetkiler
  enabled: boolean; // global olarak aktif/pasif
  language: SupportedLocale; // ana dil
  version: string;
  order: number;
  statsKey?: string;
  history: Array<{
    version: string;
    by: string;
    date: string;
    note: string;
  }>;
  routes: RouteMeta[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IModuleSetting {
  module: string; // FK (ModuleMeta.name)
  tenant: string;
  enabled?: boolean; // override
  visibleInSidebar?: boolean; // override
  useAnalytics?: boolean; // override
  showInDashboard?: boolean; // override
  roles?: string[]; // override (sadece gerekirse!)
  order?: number; // override (sıralama değişikliği için)
  // icon, label, language gibi alanlar SADECE meta’da!
  createdAt?: Date;
  updatedAt?: Date;
}
