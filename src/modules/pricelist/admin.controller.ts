import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { IPriceList, IPriceListItem } from "./types";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";

/* ---------------- utils ---------------- */
const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();
const isNonEmpty = (v: any) => typeof v === "string" && v.trim().length > 0;

// full locale map
const toFullLocales = (v: any) => fillAllLocales(v || {});

// t helper by req
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* =========================================================
   PRICE LIST (Master)
   ========================================================= */

// CREATE
export const createPriceList = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceList } = await getTenantModels(req);

  try {
    let { code, name, description, defaultCurrency, effectiveFrom, effectiveTo, status, isActive } = req.body;

    name = toFullLocales(parseIfJson(name));
    description = toFullLocales(parseIfJson(description));

    const autoCodeBase =
      SUPPORTED_LOCALES.map((l) => name?.[l]).find((v: any) => isNonEmpty(v)) || "PRICELIST";

    const doc: Partial<IPriceList> = {
      tenant: req.tenant,
      code: toUpperSnake(code || autoCodeBase),
      name,
      description,
      defaultCurrency,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
      status: status || "draft",
      isActive: isActive === "false" ? false : true,
    };

    const created = await PriceList.create(doc);
    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: created._id });
    res.status(201).json({ success: true, message: t("created"), data: created });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ success: false, message: t("error.duplicate") });
      return;
    }
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req), event: "pricelist.create", module: "pricelist", status: "fail", error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// UPDATE
export const updatePriceList = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceList } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") }); return;
  }

  const doc = await PriceList.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  try {
    const b = req.body || {};

    if (b.code) doc.code = toUpperSnake(b.code);
    if (b.name) {
      const curr = toFullLocales(doc.name);
      const incoming = toFullLocales(parseIfJson(b.name));
      doc.name = mergeLocalesForUpdate(curr, incoming);
    }
    if (b.description) {
      const curr = toFullLocales(doc.description);
      const incoming = toFullLocales(parseIfJson(b.description));
      doc.description = mergeLocalesForUpdate(curr, incoming);
    }

    if (b.defaultCurrency !== undefined) doc.defaultCurrency = b.defaultCurrency;
    if (b.effectiveFrom !== undefined) doc.effectiveFrom = new Date(b.effectiveFrom);
    if (b.effectiveTo !== undefined) doc.effectiveTo = b.effectiveTo ? new Date(b.effectiveTo) : undefined;
    if (b.status !== undefined) doc.status = b.status;
    if (b.isActive !== undefined) doc.isActive = b.isActive === "true" || b.isActive === true;

    await doc.save();
    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("updated"), data: doc });
  } catch (err: any) {
    if (err?.code === 11000) { res.status(409).json({ success: false, message: t("error.duplicate") }); return; }
    logger.withReq.error(req, t("error.update_fail"), {
      ...getRequestContext(req), event: "pricelist.update", module: "pricelist", status: "fail", error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.update_fail") });
  }
});

// GET ALL (Admin)
export const adminGetAllPriceLists = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceList } = await getTenantModels(req);

  const { q, status, isActive, effectiveAt, limit = "20", page = "1", sort = "createdAt:desc" } =
    req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant };
  if (status) filter.status = status;
  if (typeof isActive === "string") filter.isActive = isActive === "true";
  if (effectiveAt) {
    const d = new Date(effectiveAt);
    filter.effectiveFrom = { $lte: d };
    filter.$or = [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: d } }];
  }
  if (q?.trim()) filter.$text = { $search: q.trim() };

  const [sortField, sortDirRaw] = String(sort).split(":");
  const sortDir = sortDirRaw === "asc" ? 1 : -1;
  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 200);
  const skip = (Math.max(parseInt(String(page), 10) || 1, 1) - 1) * lim;

  const cursor = PriceList.find(filter)
    .sort(filter.$text ? { score: { $meta: "textScore" } } : { [sortField]: sortDir })
    .skip(skip)
    .limit(lim)
    .lean();

  const [items, total] = await Promise.all([
    cursor,
    PriceList.countDocuments(filter)
  ]);

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: items.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: items, paging: { total, limit: lim, page: Number(page) } });
});

// GET BY ID (Admin)
export const adminGetPriceListById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceList, PriceListItem } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") }); return;
  }

  const list = await PriceList.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!list) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const items = await PriceListItem.find({ tenant: req.tenant, listId: list._id, kind: "list" }).lean();
  res.status(200).json({ success: true, message: t("fetched"), data: { list, items } });
});

// DELETE (Admin)
export const deletePriceList = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceList, PriceListItem } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") }); return;
  }

  const list = await PriceList.findOne({ _id: id, tenant: req.tenant });
  if (!list) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  await PriceListItem.deleteMany({ tenant: req.tenant, listId: list._id, kind: "list" });
  await list.deleteOne();

  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});

/* =========================================================
   PRICE LIST ITEMS (LIST MODE)
   ========================================================= */

// LIST ITEMS (Admin)
export const adminGetAllPriceListItems = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceList, PriceListItem } = await getTenantModels(req);
  const { listId } = req.params;
  const { serviceCode, period, isActive } = req.query as Record<string, string>;

  if (!isValidObjectId(listId)) {
    res.status(400).json({ success: false, message: t("invalidId") }); return;
  }
  const list = await PriceList.findOne({ _id: listId, tenant: req.tenant });
  if (!list) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const filter: Record<string, any> = { tenant: req.tenant, listId: list._id, kind: "list" };
  if (serviceCode) filter.serviceCode = toUpperSnake(serviceCode);
  if (period) filter.period = period;
  if (typeof isActive === "string") filter.isActive = isActive === "true";

  const items = await PriceListItem.find(filter).sort({ createdAt: -1 }).lean();
  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: items.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: items });
});

// CREATE ITEM (LIST MODE)
export const createPriceListItem = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceList, PriceListItem } = await getTenantModels(req);
  const { listId } = req.params;

  if (!isValidObjectId(listId)) {
    res.status(400).json({ success: false, message: t("invalidId") }); return;
  }
  const list = await PriceList.findOne({ _id: listId, tenant: req.tenant });
  if (!list) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  try {
    const b = req.body;
    const item: Partial<IPriceListItem> = {
      tenant: req.tenant,
      kind: "list",
      listId: list._id,
      serviceCode: toUpperSnake(b.serviceCode),
      amount: Number(b.amount),
      currency: b.currency || list.defaultCurrency,
      period: b.period,
      notes: b.notes,
      isActive: b.isActive === "false" ? false : true,
    };
    const created = await PriceListItem.create(item);
    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: created._id });
    res.status(201).json({ success: true, message: t("created"), data: created });
  } catch (err: any) {
    if (err?.code === 11000) { res.status(409).json({ success: false, message: t("error.duplicate") }); return; }
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req), event: "pricelistitem.create", module: "pricelist", status: "fail", error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// UPDATE ITEM (LIST MODE)
export const updatePriceListItem = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceList, PriceListItem } = await getTenantModels(req);
  const { listId, itemId } = req.params;

  if (!isValidObjectId(listId) || !isValidObjectId(itemId)) {
    res.status(400).json({ success: false, message: t("invalidId") }); return;
  }

  const list = await PriceList.findOne({ _id: listId, tenant: req.tenant });
  if (!list) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const item = await PriceListItem.findOne({ _id: itemId, tenant: req.tenant, listId: list._id, kind: "list" });
  if (!item) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const b = req.body || {};
  if (b.serviceCode) item.serviceCode = toUpperSnake(b.serviceCode);
  if (b.amount !== undefined) item.amount = Number(b.amount);
  if (b.currency !== undefined) item.currency = b.currency || list.defaultCurrency;
  if (b.period !== undefined) item.period = b.period;
  if (b.notes !== undefined) item.notes = b.notes;
  if (b.isActive !== undefined) item.isActive = b.isActive === "true" || b.isActive === true;

  try {
    await item.save();
    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id: itemId });
    res.status(200).json({ success: true, message: t("updated"), data: item });
  } catch (err: any) {
    if (err?.code === 11000) { res.status(409).json({ success: false, message: t("error.duplicate") }); return; }
    logger.withReq.error(req, t("error.update_fail"), {
      ...getRequestContext(req), event: "pricelistitem.update", module: "pricelist", status: "fail", error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.update_fail") });
  }
});

// DELETE ITEM (LIST MODE)
export const deletePriceListItem = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceListItem } = await getTenantModels(req);
  const { listId, itemId } = req.params;

  if (!isValidObjectId(listId) || !isValidObjectId(itemId)) {
    res.status(400).json({ success: false, message: t("invalidId") }); return;
  }

  const item = await PriceListItem.findOne({ _id: itemId, tenant: req.tenant, listId, kind: "list" });
  if (!item) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  await item.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id: itemId });
  res.status(200).json({ success: true, message: t("deleted") });
});

/* =========================================================
   CATALOG ITEMS (menuitem_variant/modifier/deposit/... )
   ========================================================= */

// LIST CATALOG (Admin)
export const adminGetAllCatalogItems = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceListItem } = await getTenantModels(req);

  const {
    q, code, category, tags, isActive,
    validOn, codes, limit = "20", page = "1", sort = "createdAt:desc"
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant, kind: "catalog" };

  if (typeof isActive === "string") filter.isActive = isActive === "true";
  if (category) filter.category = category;
  if (code) filter.code = String(code).toLowerCase();
  if (codes) {
    const codeList = codes.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    if (codeList.length) filter.code = { $in: codeList };
  }
  if (tags) {
    const tagArr = tags.split(",").map(s => s.trim()).filter(Boolean);
    if (tagArr.length) filter.tags = { $all: tagArr };
  }
  if (validOn) {
    const d = new Date(validOn);
    filter.$and = [
      { $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: d } }] },
      { $or: [{ validTo: { $exists: false } }, { validTo: { $gte: d } }] },
    ];
  }

  // simple q search over code + name.* (regex)
  if (q?.trim()) {
    const rx = new RegExp(q.trim(), "i");
    const nameOrs = SUPPORTED_LOCALES.map(l => ({ [`name.${l}`]: rx }));
    filter.$or = [{ code: rx }, ...nameOrs];
  }

  const [sortField, sortDirRaw] = String(sort).split(":");
  const sortDir = sortDirRaw === "asc" ? 1 : -1;
  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 200);
  const skip = (Math.max(parseInt(String(page), 10) || 1, 1) - 1) * lim;

  const [items, total] = await Promise.all([
    PriceListItem.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(lim).lean(),
    PriceListItem.countDocuments(filter),
  ]);

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: items.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: items, paging: { total, limit: lim, page: Number(page) } });
});

// CREATE CATALOG (Admin)
export const adminCreateCatalogItem = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceListItem } = await getTenantModels(req);

  try {
    const b = req.body || {};
    const name = toFullLocales(parseIfJson(b.name));
    const description = toFullLocales(parseIfJson(b.description));

    const doc: Partial<IPriceListItem> = {
      tenant: req.tenant,
      kind: "catalog",
      code: String(b.code || "").toLowerCase(),
      name,
      description,
      category: b.category,
      price: Number(b.price),
      currency: b.currency || "TRY",
      tags: Array.isArray(b.tags) ? b.tags : (typeof b.tags === "string" ? b.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : []),
      validFrom: b.validFrom ? new Date(b.validFrom) : undefined,
      validTo: b.validTo ? new Date(b.validTo) : undefined,
      source: parseIfJson(b.source),
      isActive: b.isActive === "false" ? false : true,
    };

    const created = await PriceListItem.create(doc as any);
    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: created._id });
    res.status(201).json({ success: true, message: t("created"), data: created });
  } catch (err: any) {
    if (err?.code === 11000) { res.status(409).json({ success: false, message: t("error.duplicate") }); return; }
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req), event: "catalog.create", module: "pricelist", status: "fail", error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// UPDATE CATALOG (Admin)
export const adminUpdateCatalogItem = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceListItem } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidId") }); return; }

  const item = await PriceListItem.findOne({ _id: id, tenant: req.tenant, kind: "catalog" });
  if (!item) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const b = req.body || {};
  if (b.code) item.code = String(b.code).toLowerCase();
  if (b.name) item.name = mergeLocalesForUpdate(toFullLocales(item.name), toFullLocales(parseIfJson(b.name)));
  if (b.description) item.description = mergeLocalesForUpdate(toFullLocales(item.description), toFullLocales(parseIfJson(b.description)));
  if (b.category !== undefined) item.category = b.category;
  if (b.price !== undefined) item.price = Number(b.price);
  if (b.currency !== undefined) item.currency = b.currency;
  if (b.tags !== undefined) {
    item.tags = Array.isArray(b.tags) ? b.tags : (typeof b.tags === "string" ? b.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
  }
  if (b.validFrom !== undefined) item.validFrom = b.validFrom ? new Date(b.validFrom) : undefined;
  if (b.validTo !== undefined) item.validTo = b.validTo ? new Date(b.validTo) : undefined;
  if (b.source !== undefined) item.source = parseIfJson(b.source);
  if (b.isActive !== undefined) item.isActive = b.isActive === "true" || b.isActive === true;

  try {
    await item.save();
    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("updated"), data: item });
  } catch (err: any) {
    if (err?.code === 11000) { res.status(409).json({ success: false, message: t("error.duplicate") }); return; }
    logger.withReq.error(req, t("error.update_fail"), {
      ...getRequestContext(req), event: "catalog.update", module: "pricelist", status: "fail", error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.update_fail") });
  }
});

// DELETE CATALOG (Admin)
export const adminDeleteCatalogItem = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceListItem } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidId") }); return; }

  const item = await PriceListItem.findOne({ _id: id, tenant: req.tenant, kind: "catalog" });
  if (!item) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  await item.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
