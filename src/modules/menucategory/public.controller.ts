import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* Public list: aktif + yayınlanmış kategoriler (minimal alanlar) */
export const publicGetMenuCategories = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { MenuCategory } = await getTenantModels(req);

  const { q, limit = "200" } = req.query as Record<string, string>;
  const filter: Record<string, any> = { tenant: req.tenant, isActive: true, isPublished: true };

  if (q && q.trim()) {
    const qx = q.trim();
    filter.$or = [
      { code: { $regex: qx, $options: "i" } },
      { slug: { $regex: qx, $options: "i" } },
      ...SUPPORTED_LOCALES.map((lng) => ({ [`name.${lng}`]: { $regex: qx, $options: "i" } })),
    ];
  }

  const list = await (MenuCategory as any)
    .find(filter)
    .select("code slug name images order")
    .sort({ order: 1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), public: true, resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});
