import type { Request } from "express";
import type { SitemapProvider } from "./types";
import type { ISeoSetting } from "@/modules/seo/types";

function toLowerKeys<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) out[k.toLowerCase()] = v;
  return out;
}

/** models objesinde module adına en yakın anahtarı bul (case-insensitive) */
function findModelByModuleName(models: any, moduleName: string) {
  const lc = toLowerKeys(models);
  return lc[moduleName.toLowerCase()];
}

/** şema alanı var mı kontrolü */
function hasPath(m: any, field: string) {
  try {
    return !!m?.schema?.path?.(field);
  } catch {
    return false;
  }
}

/** ":token" doldurma */
function fillTemplate(tpl: string, rec: any) {
  return tpl.replace(/:([A-Za-z0-9_]+)/g, (_, k) =>
    encodeURIComponent(String(rec?.[k] ?? ""))
  );
}

export function makeAutoProvider(moduleName: string): SitemapProvider {
  return {
    module: moduleName,

    async getBasePaths(req: Request, models: any, setting: ISeoSetting) {
      const tenant = (req as any).tenant;
      const nowIso = new Date().toISOString();

      // ModuleSetting'i oku (opsiyonel override'lar)
      const { ModuleSetting } = models;
      const ms =
        (await ModuleSetting.findOne({ tenant, module: moduleName })
          .select({ sitemap: 1, enabled: 1 })
          .lean()) || ({} as any);

      // Model’i bul
      const Model = findModelByModuleName(models, moduleName);
      const list: Array<{ path: string; lastmod?: string }> = [];

      // Base path
      const basePath =
        ms?.sitemap?.basePath && ms.sitemap.basePath.startsWith("/")
          ? ms.sitemap.basePath
          : `/${moduleName}`;

      // includeListPage default: true
      if (ms?.sitemap?.includeListPage !== false) {
        list.push({ path: basePath, lastmod: nowIso });
      }

      // Model yoksa detay üretme (sadece liste sayfası)
      if (!Model) return list;

      // Filtreleri hazırla (tenant + opsiyonel alanlar)
      const filter: Record<string, any> = { tenant };

      // Şemada isActive / isPublished varsa ekle
      if (hasPath(Model, "isActive")) filter.isActive = true;
      if (hasPath(Model, "isPublished")) filter.isPublished = true;

      // ModuleSetting.sitemap.filters -> merge
      if (ms?.sitemap?.filters && typeof ms.sitemap.filters === "object") {
        Object.assign(filter, ms.sitemap.filters);
      }

      // Detay anahtarı (slug→code→_id sırası)
      const detailKey =
        ms?.sitemap?.detailKey ||
        (hasPath(Model, "slug") ? "slug" : hasPath(Model, "code") ? "code" : "_id");

      // Alan seçimi
      const select: any = { updatedAt: 1 };
      if (detailKey) select[detailKey] = 1;

      // Sıralama: updatedAt varsa desc, yoksa createdAt desc
      const sort = hasPath(Model, "updatedAt") ? { updatedAt: -1 } : { createdAt: -1 };
      const limit =
        typeof ms?.sitemap?.limit === "number" && ms.sitemap.limit > 0
          ? ms.sitemap.limit
          : 50000;

      const rows = await Model.find(filter).select(select).sort(sort).limit(limit).lean();

      for (const r of rows) {
        const lastmod = (r as any)?.updatedAt?.toISOString?.() || nowIso;
        // detailPath: template öncelikli
        let detailPath: string;
        if (ms?.sitemap?.detailPathTemplate) {
          detailPath = fillTemplate(ms.sitemap.detailPathTemplate, r);
        } else {
          const val = encodeURIComponent(String((r as any)?.[detailKey]));
          detailPath = `${basePath}${basePath.endsWith("/") ? "" : "/"}` + val;
        }
        list.push({ path: detailPath, lastmod });
      }

      return list;
    },
  };
}
