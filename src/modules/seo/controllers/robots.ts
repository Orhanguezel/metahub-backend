// robots.txt controller
import type { Request, Response, RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { resolveSiteUrl } from "../utils/urls";

/* i18n */
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "../i18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

export const robotsTxt: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);

  const tenant = (req as any).tenant;
  if (!tenant) {
    res.status(400).type("text/plain").send(t("tenant.required"));
    return;
  }

  const { SeoSetting } = await getTenantModels(req);
  const setting = await SeoSetting.findOne({ tenant }).lean();
  const siteUrl = resolveSiteUrl(req, setting || undefined);

  // indexing: default true (ayar yoksa izin ver)
  const allow = setting?.enableIndexing !== false;

  // robots.txt içeriği (çeviri yapılmaz; bot söz dizimi sabittir)
  const lines: string[] = [];
  lines.push("User-agent: *");
  lines.push(allow ? "Allow: /" : "Disallow: /");
  if (siteUrl) {
    lines.push(`Sitemap: ${siteUrl}/api/seo/sitemap-index.xml`);
  }

  const cc = setting?.cacheSeconds ?? 3600;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", `public, max-age=${cc}, s-maxage=${cc}`);
  res.status(200).send(lines.join("\n"));
});
