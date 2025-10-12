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
const toUpper = (s?: string) => (s ? String(s).trim().toUpperCase() : s);
const toUpperMapValues = (obj?: Record<string, string>) => {
  if (!obj || typeof obj !== "object") return obj as any;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) out[String(k).toUpperCase()] = String(v).toUpperCase();
  return out;
};

/** "123.45" | "123,45" → 12345 (cents)  */
function toCents(v: any): number | undefined {
  if (v == null || v === "") return undefined;
  const s = String(v).replace(",", ".");
  const n = Number(s);
  if (Number.isNaN(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

/** build optionsKey exactly like model does */
function buildOptionsKey(options?: Record<string, string>): string {
  if (!options || typeof options !== "object") return "DEFAULT";
  return Object.entries(options)
    .map(([k, v]) => `${String(k).toUpperCase()}=${String(v).toUpperCase()}`)
    .sort()
    .join("|") || "DEFAULT";
}

/* ===== CREATE ===== */
export const createVariant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { ProductVariant } = await getTenantModels(req);

  const payload = { ...(req.body || {}) };
  (payload as any).tenant = (req as any).tenant;

  if (payload.sku) payload.sku = toUpper(payload.sku);
  if (payload.currency) payload.currency = toUpper(payload.currency);
  if (payload.options) {
    payload.options = parseIfJson(payload.options);
    payload.options = toUpperMapValues(payload.options);
  }

  // cents mapping (accept price or price_cents)
  const price_cents =
    (payload.price_cents != null ? Number(payload.price_cents) : undefined) ??
    toCents(payload.price);
  const offer_price_cents =
    (payload.offer_price_cents != null ? Number(payload.offer_price_cents) : undefined) ??
    toCents(payload.salePrice);

  if (price_cents == null) {
    res.status(400).json({ success: false, message: t("validation.priceInvalid") });
    return;
  }

  // Uniqueness guards
  const skuExists = await ProductVariant.findOne({
    tenant: (req as any).tenant,
    sku: payload.sku,
  }).select("_id").lean();
  if (skuExists) {
    res.status(400).json({ success: false, message: t("alreadyExistsSku") });
    return;
  }

  const optionsKey = buildOptionsKey(payload.options);
  const optExists = await ProductVariant.findOne({
    tenant: (req as any).tenant,
    product: payload.product,
    optionsKey,
  }).select("_id").lean();
  if (optExists) {
    res.status(400).json({ success: false, message: t("alreadyExistsOptions") });
    return;
  }

  const doc = await ProductVariant.create({
    tenant: (req as any).tenant,
    product: payload.product,
    sku: payload.sku,
    barcode: payload.barcode,
    options: payload.options,
    optionsKey,
    price_cents,
    offer_price_cents,
    currency: payload.currency || "TRY",
    stock: payload.stock ?? 0,
    image: payload.image,
    isActive: payload.isActive !== false,
  });

  res.status(201).json({ success: true, message: t("created"), data: doc });
});

/* ===== UPDATE ===== */
export const updateVariant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { ProductVariant } = await getTenantModels(req);
  const doc = await ProductVariant.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const up = { ...(req.body || {}) };
  if (up.sku) up.sku = toUpper(up.sku);
  if (up.currency) up.currency = toUpper(up.currency);

  // options
  if (up.options !== undefined) {
    up.options = toUpperMapValues(parseIfJson(up.options));
    (doc as any).options = up.options;
    (doc as any).optionsKey = buildOptionsKey(up.options);
  }

  // price mapping
  if (up.price_cents != null || up.price != null) {
    const cents = up.price_cents != null ? Number(up.price_cents) : toCents(up.price);
    if (cents == null) {
      res.status(400).json({ success: false, message: t("validation.priceInvalid") });
      return;
    }
    (doc as any).price_cents = cents;
  }
  if (up.offer_price_cents != null || up.salePrice != null) {
    const cents = up.offer_price_cents != null ? Number(up.offer_price_cents) : toCents(up.salePrice);
    if (cents != null) (doc as any).offer_price_cents = cents;
  }

  const updatable = [
    "product","sku","barcode","currency","stock","image","isActive",
  ] as const;
  for (const k of updatable) if ((up as any)[k] !== undefined) (doc as any)[k] = (up as any)[k];

  // Uniqueness guards
  if (up.sku && up.sku !== (doc as any).sku) {
    const clash = await ProductVariant.findOne({
      tenant: (req as any).tenant,
      sku: up.sku,
      _id: { $ne: id },
    }).select("_id").lean();
    if (clash) {
      res.status(400).json({ success: false, message: t("alreadyExistsSku") });
      return;
    }
  }

  if (up.options !== undefined || up.product) {
    const key = buildOptionsKey((doc as any).options);
    const clash = await ProductVariant.findOne({
      tenant: (req as any).tenant,
      product: (doc as any).product,
      optionsKey: key,
      _id: { $ne: id },
    }).select("_id").lean();
    if (clash) {
      res.status(400).json({ success: false, message: t("alreadyExistsOptions") });
      return;
    }
    (doc as any).optionsKey = key;
  }

  await doc.save();
  res.status(200).json({ success: true, message: t("updated"), data: doc });
});

/* ===== DELETE ===== */
export const deleteVariant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { ProductVariant } = await getTenantModels(req);
  const doc = await ProductVariant.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  res.status(200).json({ success: true, message: t("deleted") });
});

/* ===== ADMIN LIST ===== */
export const adminListVariants = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { ProductVariant } = await getTenantModels(req);

  const {
    product, q, isActive, currency, min_price, max_price, min_stock, max_stock,
    limit = "200", sort = "created_desc",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: (req as any).tenant };
  if (product && isValidObjectId(product)) filter.product = product;
  if (typeof isActive === "string") filter.isActive = isActive === "true";
  if (currency) filter.currency = String(currency).toUpperCase();

  // price filters (float → cents)
  const minC = min_price != null ? toCents(min_price) : undefined;
  const maxC = max_price != null ? toCents(max_price) : undefined;
  if (minC != null || maxC != null) {
    filter.price_cents = {};
    if (minC != null) filter.price_cents.$gte = minC;
    if (maxC != null) filter.price_cents.$lte = maxC;
  }

  if (min_stock || max_stock) {
    filter.stock = {};
    if (min_stock) filter.stock.$gte = Number(min_stock);
    if (max_stock) filter.stock.$lte = Number(max_stock);
  }

  if (q && q.trim()) {
    const rex = { $regex: q.trim(), $options: "i" };
    filter.$or = [{ sku: rex }, { barcode: rex }];
  }

  const sortMap: Record<string, any> = {
    created_desc: { createdAt: -1 },
    created_asc: { createdAt: 1 },
    price_asc: { price_cents: 1, createdAt: -1 },
    price_desc: { price_cents: -1, createdAt: -1 },
    stock_desc: { stock: -1, createdAt: -1 },
    stock_asc: { stock: 1, createdAt: -1 },
    sku_asc: { sku: 1, createdAt: -1 },
    sku_desc: { sku: -1, createdAt: -1 },
  };

  const items = await ProductVariant.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort(sortMap[sort] || sortMap.created_desc)
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: items });
});

/* ===== GET BY ID ===== */
export const adminGetVariantById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { ProductVariant } = await getTenantModels(req);
  const doc = await ProductVariant.findOne({ _id: id, tenant: (req as any).tenant }).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
