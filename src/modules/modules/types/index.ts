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
  label: TranslatedLabel;
  icon: string;
  roles: string[];
  enabled: boolean;
  language: SupportedLocale;
  version: string;
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
  module: string;
  tenant: string;
  enabled: boolean;
  visibleInSidebar: boolean;
  useAnalytics: boolean;
  showInDashboard: boolean;
  roles: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
