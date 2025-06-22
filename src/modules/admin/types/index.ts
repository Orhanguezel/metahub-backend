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
  tenants: string[]; // DİKKAT: tenant dizisi!
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

// Ayarlar artık tenant’a özel değil, sadece project->modül, (ileride project kalkacak)
export interface IModuleSetting {
  module: string;
  tenant: string;
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
