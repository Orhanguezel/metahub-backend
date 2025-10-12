import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { isValidObjectId } from "@/core/middleware/auth/validation";

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), translations);

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const toUpperMapValues = (obj?: Record<string, string>) => {
  if (!obj || typeof obj !== "object") return obj as any;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) out[String(k).toUpperCase()] = String(v).toUpperCase();
  return out;
};
function buildOptionsKey(options?: Record<string, string>): string {
  if (!options || typeof options !== "object") return "DEFAULT";
  return Object.entries(options)
    .map(([k, v]) => `${String(k).toUpperCase()}=${String(v).toUpperCase()}`)
    .sort()
    .join("|") || "DEFAULT";
}

/** LIST by product (active only by default) */
export const publicListByProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { product } = req.params as { product: string };
  const { ProductVariant } = await getTenantModels(req);

  if (!isValidObjectId(product)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { onlyActive = "true", limit = "200" } = req.query as Record<string, string>;
  const filter: Record<string, any> = {
    tenant: (req as any).tenant,
    product,
  };
  if (onlyActive === "true") filter.isActive = true;

  const items = await ProductVariant.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ price: 1, createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: items });
});

/** GET by SKU (active only) */
export const publicGetBySku = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { sku } = req.params as { sku: string };
  const { ProductVariant } = await getTenantModels(req);

  const doc = await ProductVariant.findOne({
    tenant: (req as any).tenant,
    sku: String(sku || "").trim().toUpperCase(),
    isActive: true,
  }).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

/** RESOLVE by options (product + options → variant) */
export const publicResolveVariant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { product, options } = (req.body || {}) as { product: string; options: Record<string, string> };
  const { ProductVariant } = await getTenantModels(req);

  if (!isValidObjectId(product)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const opts = toUpperMapValues(parseIfJson(options));
  const key = buildOptionsKey(opts);

  const doc = await ProductVariant.findOne({
    tenant: (req as any).tenant,
    product,
    optionsKey: key,
    isActive: true,
  }).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
