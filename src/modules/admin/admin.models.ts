// src/modules/admin/admin.models.ts
export type ModuleMeta = {
    name: string;
    label: {
      en: string;
      de: string;
      tr: string;
    };
    description: {
      en: string;
      de: string;
      tr: string;
    };
    icon: string;
    visibleInSidebar: boolean;
    roles: string[];
    enabled: boolean;
    useAnalytics: boolean;
    routes: {
      method: string;
      path: string;
      auth?: boolean;
      summary?: string;
    }[];
  };
  