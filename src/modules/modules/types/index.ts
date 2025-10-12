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
  /** 🔽 Sitemap otomasyonuna özel (tamamı opsiyonel, backward-compatible) */
  sitemap?: {
    /** Modül özelinde sitemap’e dahil/haric (varsayılan: ModuleMeta.enabled + enabled override) */
    enabled?: boolean;
    /** Liste sayfasının yolu (örn: "/blog"). Varsayılan: `/${module}` */
    basePath?: string;
    /** Detay URI oluştururken kullanılacak alan (örn: "slug" | "code" | "_id"). Varsayılan: slug→code→_id */
    detailKey?: string;
    /**
     * Tam şablon (örn: "/blog/:slug" veya "/services/:code").
     * Verideki ":field" token'ları encode edilerek doldurulur.
     * Bu varsa `basePath + '/' + detailKey` yerine bu kullanılır.
     */
    detailPathTemplate?: string;
    /** Liste sayfasını ekleyelim mi? (varsayılan: true) */
    includeListPage?: boolean;
    /** Ek filtreler (Mongo koşulları). Örn: { status: "published" } */
    filters?: Record<string, any>;
    /** Maks belge (varsayılan: 50000) */
    limit?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}
