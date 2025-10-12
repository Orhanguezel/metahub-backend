import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import i18n from "./i18n";

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), i18n);

async function getModels(req: Request) {
  const m: any = await getTenantModels(req);
  const Compare = m.Compare || (await import("./models")).Compare;
  return { Compare };
}

/* LIST */
export const adminListCompares = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Compare } = await getModels(req);
  const t = tByReq(req);

  const { user, session, limit = "200" } = req.query as Record<string, string>;
  const filter: Record<string, any> = { tenant: (req as any).tenant };
  if (user) filter.user = user;
  if (session) filter.session = session;

  const rows = await Compare.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ updatedAt: -1 })
    .populate([
      { path: "user", select: "name email" },
      { path: "items.product", select: "title slug price_cents currency" },
      { path: "items.variant", select: "sku optionsKey price_cents" },
    ])
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: rows });
  return;
});

/* GET BY ID */
export const adminGetCompareById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Compare } = await getModels(req);
  const t = tByReq(req);

  const doc = await Compare.findOne({ _id: req.params.id, tenant: (req as any).tenant })
    .populate([
      { path: "user", select: "name email" },
      { path: "items.product", select: "title slug price_cents currency" },
      { path: "items.variant", select: "sku optionsKey price_cents" },
    ])
    .lean();

  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }
  res.status(200).json({ success: true, message: t("fetched"), data: doc });
  return;
});

/* DELETE */
export const adminDeleteCompare = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Compare } = await getModels(req);
  const t = tByReq(req);

  const doc = await Compare.findOne({ _id: req.params.id, tenant: (req as any).tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }
  await (doc as any).deleteOne();
  res.status(200).json({ success: true, message: t("deleted") });
  return;
});
