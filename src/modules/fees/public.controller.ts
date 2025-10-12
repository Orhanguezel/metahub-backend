import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), translations);

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

/** Public list: only active fees, optional filters (currency/mode/when) */
export const publicListFees = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { FeeRule } = await getTenantModels(req);

  const { currency, mode, when, limit = "200" } = req.query as Record<string, string>;
  const filter: Record<string, any> = { tenant: (req as any).tenant, isActive: true };

  if (currency) filter.currency = String(currency).toUpperCase();
  if (mode) filter.mode = mode;
  if (when) {
    const arr = Array.isArray(when) ? when : parseIfJson(when);
    const list = Array.isArray(arr) ? arr : [when];
    filter.appliesWhen = { $in: list };
  }

  const items = await FeeRule.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ code: 1, createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: items });
  return;
});

/** Public get by code (active only) */
export const publicGetFeeByCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { code } = req.params as { code: string };
  const { FeeRule } = await getTenantModels(req);

  const doc = await FeeRule.findOne({
    tenant: (req as any).tenant,
    code: String(code || "").trim().toLowerCase(),
    isActive: true,
  }).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
  return;
});
