import type { Request } from "express";
import type { ISeoSetting } from "@/modules/seo/types";

export type BasePath = { path: string; lastmod?: string };

export interface SitemapProvider {
  /** ModuleMeta.name ile birebir aynı anahtar (örn. "apartment", "about", "servicecatalog") */
  module: string;

  /**
   * Bu modül için sitemap’e eklenecek base path’leri üretir.
   * - Tenant filtrelemesi: provider içinde yapılır (req.tenant)
   * - Dönüş: path ABSOLUTE DEĞİL ("/" ile başlayan relative)
   */
  getBasePaths(
    req: Request,
    models: Awaited<ReturnType<typeof import("@/core/middleware/tenant/getTenantModels").getTenantModels>>,
    setting: ISeoSetting
  ): Promise<BasePath[]>;
}

export interface SitemapProvider {
  module: string;
  getBasePaths(
    req: Request,
    models: Awaited<
      ReturnType<typeof import("@/core/middleware/tenant/getTenantModels").getTenantModels>
    >,
    setting: ISeoSetting
  ): Promise<BasePath[]>;
}
