// src/modules/modules/types.ts
import { SupportedLocale } from "@/types/common";

export type TranslatedLabel = Record<SupportedLocale, string>;

export interface IModuleMeta {
  tenant: string;
  name: string;
  label: TranslatedLabel;
  icon: string;
  roles: string[];
  enabled: boolean;
  language: SupportedLocale;
  version: string;
  order: number;
  statsKey?: string;
  history?: Array<{
    version: string;
    by: string;
    date: Date;      // ← schema'da Date, burada da Date
    note?: string;
  }>;
  routes?: Array<{
    method: string;
    path: string;
    auth?: boolean;
    summary?: string;
    body?: any;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IModuleSetting {
  module: string;
  tenant: string;
  enabled?: boolean;
  visibleInSidebar?: boolean;
  useAnalytics?: boolean;
  showInDashboard?: boolean;
  roles?: string[];
  order?: number;
  seoTitle?: TranslatedLabel;
  seoDescription?: TranslatedLabel;
  seoSummary?: TranslatedLabel;
  seoOgImage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
