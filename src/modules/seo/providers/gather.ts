import type { Request } from "express";
import { getProvider } from "./index";
import { makeAutoProvider } from "./auto.provider";
import type { BasePath } from "./types";
import type { ISeoSetting } from "@/modules/seo/types";

export async function getActiveModuleNames(req: Request): Promise<string[]> {
  const { getTenantModels } = await import("@/core/middleware/tenant/getTenantModels");
  const models = await getTenantModels(req);

  const [metas, settings] = await Promise.all([
    models.ModuleMeta.find({ tenant: req.tenant }).select({ name: 1, enabled: 1 }).lean(),
    models.ModuleSetting.find({ tenant: req.tenant }).select({ module: 1, enabled: 1, sitemap: 1 }).lean(),
  ]);

  const settingMap = new Map<string, { enabled?: boolean; sitemap?: any }>();
  for (const s of settings) {
    settingMap.set((s as any).module, { enabled: (s as any).enabled, sitemap: (s as any).sitemap });
  }

  const active: string[] = [];
  for (const m of metas) {
    const name = (m as any).name as string;
    const metaEnabled = (m as any).enabled !== false;
    const override = settingMap.get(name)?.enabled;

    const sitemapEnabled = settingMap.get(name)?.sitemap?.enabled;
    // sitemap.enabled false ise kesin çıkar, true ise kesin ekle
    const enabledBySitemap =
      typeof sitemapEnabled === "boolean" ? sitemapEnabled : undefined;

    const isOn =
      enabledBySitemap === false
        ? false
        : enabledBySitemap === true
        ? true
        : override === false
        ? false
        : override === true
        ? true
        : metaEnabled;

    if (isOn) active.push(name);
  }
  return active;
}

export async function gatherBasePaths(
  req: Request,
  setting: ISeoSetting
): Promise<BasePath[]> {
  const { getTenantModels } = await import("@/core/middleware/tenant/getTenantModels");
  const models = await getTenantModels(req);

  const activeModuleNames = await getActiveModuleNames(req);

  const providers = activeModuleNames.map((n) => getProvider(n) ?? makeAutoProvider(n));

  const nowIso = new Date().toISOString();
  const base: BasePath[] = [{ path: "/", lastmod: nowIso }];

  for (const p of setting?.extraStaticPaths || []) {
    if (p?.path) base.push({ path: p.path, lastmod: p.lastModified });
  }

  if (!providers.length) return base;

  const chunks = await Promise.all(
    providers.map((p) => p.getBasePaths(req, models, setting))
  );

  return base.concat(...chunks);
}
