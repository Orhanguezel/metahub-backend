// src/modules/admin/admin.models.ts

export type RouteMeta = {
  method: string;
  path: string;
  auth?: boolean;
  summary?: string;
  body?: any;
};

export type ModuleMeta = {
  name: string;
  icon: string;
  visibleInSidebar: boolean;
  roles: string[];
  enabled: boolean;
  useAnalytics: boolean;
  language: "tr" | "en" | "de";
  routes: RouteMeta[];
};

