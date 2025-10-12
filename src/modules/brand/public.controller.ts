import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), translations);

// readonly tuple → ReadonlyArray olarak kullan
const LOCALES: ReadonlyArray<SupportedLocale> = SUPPORTED_LOCALES;

/* List active brands (public) */
export const publicListBrands = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { Brand } = await getTenantModels(req);

  const { q, lang = "tr", limit = "200" } = req.query as Record<string, string>;
  const filter: Record<string, any> = { tenant: (req as any).tenant, status: "active" };

  if (q && q.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { [`name.${lang}`]: rx },
      // Burada artık readonly → mutable cast yok
      ...LOCALES.map((l) => ({ [`slugLower.${l}`]: rx })),
    ];
  }

  const list = await Brand.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ order: 1, createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

/* Get brand by slug (public, locale-aware + fallback) */
export const publicGetBrandBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { Brand } = await getTenantModels(req);
  const { slug } = req.params as { slug: string };

  // 1) Öncelik: req.locale
  // 2) Query: ?lang=tr/en/...
  // 3) Son çare: getLogLocale() -> "en"
  const qLang = req.query.lang as SupportedLocale | undefined;
  const locale: SupportedLocale =
    ((req as any).locale as SupportedLocale) || qLang || (getLogLocale() as SupportedLocale) || "en";

  const lower = String(slug).toLowerCase();

  // Önce seçili locale
  let doc = await Brand.findOne({
    tenant: (req as any).tenant,
    status: "active",
    [`slugLower.${locale}`]: lower,
  }).lean();

  // Bulunamazsa tüm locale’lerde ara (fallback)
  if (!doc) {
    doc = await Brand.findOne({
      tenant: (req as any).tenant,
      status: "active",
      $or: LOCALES.map((l) => ({ [`slugLower.${l}`]: lower })),
    }).lean();
  }

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }
  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
