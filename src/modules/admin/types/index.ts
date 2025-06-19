// src/types/module.ts veya ilgili module types dosyası
import type { SupportedLocale, TranslatedLabel } from "@/types/common";

export type RouteMeta = {
  method: string;
  path: string;
  auth?: boolean;
  summary?: string;
  body?: any;
};

export interface IModuleMeta {
  name: string;
  tenant: string; // Optional tenant field for multi-tenancy
  label: TranslatedLabel;
  icon: string;
  roles: string[];
  visibleInSidebar: boolean;
  enabled: boolean;
  useAnalytics: boolean;
  language: SupportedLocale;
  version: string;
  showInDashboard: boolean;
  order: number;
  statsKey?: string;
  history: {
    version: string;
    by: string;
    date: string;
    note: string;
  }[];
  routes: RouteMeta[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IModuleSetting {
  project: string;
  module: string;
  enabled: boolean;
  visibleInSidebar: boolean;
  useAnalytics: boolean;
  roles: string[];
  icon: string;
  label: TranslatedLabel;
  language: SupportedLocale;
  createdAt?: Date;
  updatedAt?: Date;
}
