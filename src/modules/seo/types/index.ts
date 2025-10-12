import type { SupportedLocale } from "@/types/common";

export type Changefreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

/**
 * Tenant başına tek ayar dokümanı.
 * Dil (locales/primaryLocale) defaultları dışarıdan (SUPPORTED_LOCALES / ENV) gelir.
 */
export interface ISeoSetting {
  tenant: string;                         // unique per tenant
  siteUrl?: string;                       // https://example.com  (trailing slash yok)
  enableIndexing?: boolean;               // robots.txt için
  defaultChangefreq?: Changefreq;         // varsayılan: weekly
  defaultPriority?: number;               // 0.1 - 1.0 (varsayılan: 0.7)
  locales?: SupportedLocale[];            // dışarıdan SUPPORTED_LOCALES ile beslenir
  primaryLocale?: SupportedLocale;        // dışarıdan default (ENV/SUPPORTED_LOCALES[0])
  excludePatterns?: string[];             // ["^/admin", "^/draft"] gibi regex stringleri
  extraStaticPaths?: Array<{ path: string; lastModified?: string }>;
  sitemapSplitThreshold?: number;         // default 50000
  cacheSeconds?: number;                  // default 3600
  createdAt?: Date;
  updatedAt?: Date;
}
