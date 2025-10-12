import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), translations);

/* Public list: only active */
export const publicListAttributes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { ProductAttribute } = await getTenantModels(req);

  const { q, lang = "tr", type, group, limit = "200" } = req.query as Record<string, string>;
  const filter: Record<string, any> = { tenant: (req as any).tenant, isActive: true };
  if (type) filter.type = type;
  if (group) filter.group = group;

  if (q && q.trim()) {
    const rex = { $regex: q.trim(), $options: "i" };
    filter.$or = [
      { code: rex },
      { [`name.${lang}`]: rex },
      { "values.code": rex },
      { [`values.label.${lang}`]: rex },
    ];
  }

  const list = await ProductAttribute.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ sort: 1, code: 1, createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

/* Public get by code (active only) */
export const publicGetAttributeByCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { code } = req.params as { code: string };
  const { ProductAttribute } = await getTenantModels(req);

  const doc = await ProductAttribute.findOne({
    tenant: (req as any).tenant,
    code: String(code || "").toUpperCase(),
    isActive: true,
  }).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
