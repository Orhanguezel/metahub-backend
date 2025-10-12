// src/modules/seo/controllers/sitemap.ts
import type { Request, Response, RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { resolveSiteUrl, toAbs, compileExcludes, isExcluded } from "../utils/urls";
import { buildSitemapXml, buildSitemapIndexXml, makeETagFromUrls, type UrlEntry } from "../utils/xml";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "../i18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { gatherBasePaths } from "../providers/gather";

/* i18n */
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* ---------- Locale helpers (SABİT DİL YOK) ---------- */
const defaultLocales = (): string[] => {
  const list = Array.isArray(SUPPORTED_LOCALES) ? (SUPPORTED_LOCALES as SupportedLocale[]) : [];
  return list.map(String).filter(Boolean);
};

// FE ile hizalı ENV adı (geri uyum için DEFAULT_LOCALE de okunur)
const defaultPrimary = (): string => {
  const env =
    process.env.NEXT_PUBLIC_DEFAULT_LOCALE ||
    process.env.DEFAULT_LOCALE;
  if (env && typeof env === "string" && env.trim()) return env.trim();
  const locs = defaultLocales();
  return String(locs[0] || "");
};

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

/**
 * JSON endpoint (FE debug / health)
 * GET /seo/sitemap-urls
 *  - Artık tüm locale varyantlarını döner: "/de/...", "/tr/...", ...
 */
export const listSitemapUrls: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const tenant = (req as any).tenant;
  if (!tenant) {
    res.status(400).json({ success: false, message: t("tenant.required") });
    return;
  }

  const { SeoSetting } = await getTenantModels(req);
  const setting = await SeoSetting.findOne({ tenant }).lean();

  const basePaths = await gatherBasePaths(req, setting || ({} as any));

  // excludePatterns uygula
  const excludeRe = compileExcludes(setting?.excludePatterns || []);
  const filtered = basePaths.filter((p) => !isExcluded(p.path, excludeRe));

  // Locale listesi (primary ayrıcalığı yok; hepsi /{l} ile)
  const locales = uniq(
    (Array.isArray(setting?.locales) && setting?.locales?.length
      ? (setting!.locales as string[])
      : defaultLocales()
    ).map(String).filter(Boolean)
  );

  const nowIso = new Date().toISOString();
  const makeLocalized = (p: string, l: string) => `/${l}${p === "/" ? "" : p}`;

  const urls = filtered.flatMap((p) =>
    locales.map((l) => ({
      path: makeLocalized(p.path, l),
      lastModified: p.lastmod || nowIso,
    }))
  );

  res.status(200).json({ success: true, message: "sitemap.urls.fetched", data: urls });
});

/* ---------- içerikten URL listesi üret + locale varyantları & exclude ---------- */

async function collectLocalizedUrls(req: Request): Promise<{
  siteUrl: string;
  urls: UrlEntry[];
  locales: string[];
  cfg: { changefreq: string; priority: number; cacheSeconds: number; split: number };
}> {
  const tenant = (req as any).tenant;
  if (!tenant) throw new Error("tenant.required");

  const { SeoSetting } = await getTenantModels(req);

  const setting = await SeoSetting.findOne({ tenant }).lean();
  const siteUrl = resolveSiteUrl(req, setting || undefined);
  if (!siteUrl) throw new Error("seo.siteUrl.missing");

  const locales = uniq(
    (Array.isArray(setting?.locales) && setting?.locales?.length
      ? (setting!.locales as string[])
      : defaultLocales()
    ).map(String).filter(Boolean)
  );
  const primaryRaw = (setting?.primaryLocale as string) || defaultPrimary();
  const primary = locales.includes(primaryRaw) ? primaryRaw : (locales[0] || "");

  const defaultChangefreq = setting?.defaultChangefreq || "weekly";
  const defaultPriority =
    typeof setting?.defaultPriority === "number" ? setting.defaultPriority : 0.7;
  const cacheSeconds = setting?.cacheSeconds ?? 3600;
  const split = setting?.sitemapSplitThreshold ?? 50000;

  // Base path’leri dinamik topla (aktif modüllerden)
  const basePaths = await gatherBasePaths(req, setting as any);

  // excludePattern uygula
  const excludeRe = compileExcludes(setting?.excludePatterns || []);
  const filtered = basePaths.filter((p) => !isExcluded(p.path, excludeRe));

  // Locale varyantları: TÜM diller /{l} ile; x-default ⇒ primary’nin URL’si
  const makeLocalized = (p: string, l: string) => `/${l}${p === "/" ? "" : p}`;
  const urls: UrlEntry[] = [];

  for (const b of filtered) {
    // hreflang alternates (hepsi locale’li)
    const alternates = locales.map((l) => ({
      hreflang: l,
      href: toAbs(siteUrl, makeLocalized(b.path, l)),
    }));
    // x-default: primary locale URL’si
    alternates.push({
      hreflang: "x-default",
      href: toAbs(siteUrl, makeLocalized(b.path, primary)),
    });

    for (const l of locales) {
      const locPath = makeLocalized(b.path, l);
      const loc = toAbs(siteUrl, locPath);
      urls.push({
        loc,
        lastmod: b.lastmod,
        changefreq: defaultChangefreq,
        priority: defaultPriority,
        alternates,
      });
    }
  }

  return {
    siteUrl,
    urls,
    locales,
    cfg: { changefreq: defaultChangefreq, priority: defaultPriority, cacheSeconds, split },
  };
}

/**
 * GET /seo/sitemap.xml  → Tek dosya (<=split)
 * GET /seo/sitemap-:page.xml → Sayfalanmış
 * GET /seo/sitemap-index.xml → Index
 */
export const getSitemapXmlSingle: RequestHandler = asyncHandler(async (req, res) => {
  const tenant = (req as any).tenant;
  if (!tenant) {
    res.status(400).type("application/xml").send(`<error>tenant.required</error>`);
    return;
  }

  const { urls, cfg } = await collectLocalizedUrls(req);
  if (urls.length > cfg.split) {
    res.status(302).setHeader("Location", "/api/seo/sitemap-index.xml").end();
    return;
  }

  const etag = makeETagFromUrls(urls);
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", `public, max-age=${cfg.cacheSeconds}, s-maxage=${cfg.cacheSeconds}`);
  res.setHeader("ETag", etag);

  const xml = buildSitemapXml(urls);
  res.status(200).send(xml);
});

export const getSitemapXmlPage: RequestHandler = asyncHandler(async (req, res) => {
  const tenant = (req as any).tenant;
  if (!tenant) {
    res.status(400).type("application/xml").send(`<error>tenant.required</error>`);
    return;
  }
  const page = Math.max(1, parseInt((req.params as any).page, 10) || 1);

  const { urls, cfg } = await collectLocalizedUrls(req);
  const start = (page - 1) * cfg.split;
  const slice = urls.slice(start, start + cfg.split);
  if (!slice.length) {
    res.status(404).type("application/xml").send(`<error>not.found</error>`);
    return;
  }

  const etag = makeETagFromUrls(slice);
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", `public, max-age=${cfg.cacheSeconds}, s-maxage=${cfg.cacheSeconds}`);
  res.setHeader("ETag", etag);

  const xml = buildSitemapXml(slice);
  res.status(200).send(xml);
});

export const getSitemapIndexXml: RequestHandler = asyncHandler(async (req, res) => {
  const tenant = (req as any).tenant;
  if (!tenant) {
    res.status(400).type("application/xml").send(`<error>tenant.required</error>`);
    return;
  }

  const { siteUrl, urls, cfg } = await collectLocalizedUrls(req);
  const pages = Math.ceil(urls.length / cfg.split) || 1;

  const items = Array.from({ length: pages }).map((_, i) => ({
    loc: `${siteUrl}/api/seo/sitemap-${i + 1}.xml`,
    lastmod: new Date().toISOString(),
  }));

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", `public, max-age=${cfg.cacheSeconds}, s-maxage=${cfg.cacheSeconds}`);

  const xml = pages === 1 ? buildSitemapXml(urls) : buildSitemapIndexXml(items);
  res.status(200).send(xml);
});
