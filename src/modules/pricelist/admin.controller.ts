import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
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

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

// her zaman full locale map'e çevir
const toFullLocales = (v: any) => fillAllLocales(v || {});

/* ===================== PRICE LIST ===================== */

// CREATE
export const createPriceList = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { PriceList } = await getTenantModels(req);

  try {
    let { code, name, description, defaultCurrency, effectiveFrom, effectiveTo, status, isActive } = req.body;

    name = toFullLocales(parseIfJson(name));
    description = toFullLocales(parseIfJson(description));

    const doc: Partial<IPriceList> = {
      tenant: req.tenant,
      code: toUpperSnake(code || (SUPPORTED_LOCALES.map(l => name?.[l]).find((v:string)=>v?.trim()) || "PRICELIST")),
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
      ...getRequestContext(req),
      event: "pricelist.create",
      module: "pricelist",
      status: "fail",
      error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// UPDATE
export const updatePriceList = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { PriceList } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await PriceList.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  try {
    const b = req.body || {};

    if (b.code) doc.code = toUpperSnake(b.code);
    if (b.name) {
      const current = toFullLocales(doc.name);
      const incoming = toFullLocales(parseIfJson(b.name));
      doc.name = mergeLocalesForUpdate(current, incoming);
    }
    if (b.description) {
      const current = toFullLocales(doc.description);
      const incoming = toFullLocales(parseIfJson(b.description));
      doc.description = mergeLocalesForUpdate(current, incoming);
    }

    if (b.defaultCurrency) doc.defaultCurrency = b.defaultCurrency;
    if (b.effectiveFrom !== undefined) doc.effectiveFrom = new Date(b.effectiveFrom);
    if (b.effectiveTo !== undefined) doc.effectiveTo = b.effectiveTo ? new Date(b.effectiveTo) : undefined;
    if (b.status !== undefined) doc.status = b.status;
    if (b.isActive !== undefined) doc.isActive = b.isActive === "true" || b.isActive === true;

    await doc.save();
    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("updated"), data: doc });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ success: false, message: t("error.duplicate") });
      return;
    }
    logger.withReq.error(req, t("error.update_fail"), {
      ...getRequestContext(req),
      event: "pricelist.update",
      module: "pricelist",
      status: "fail",
      error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.update_fail") });
  }
});

// GET ALL (Admin)
export const adminGetAllPriceLists = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { PriceList } = await getTenantModels(req);

  const { q, status, isActive, effectiveAt } = req.query as Record<string, string>;
  const filter: Record<string, any> = { tenant: req.tenant };

  if (status) filter.status = status;
  if (typeof isActive === "string") filter.isActive = isActive === "true";

  if (effectiveAt) {
    const d = new Date(effectiveAt);
    filter.effectiveFrom = { $lte: d };
    filter.$or = [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: d } }];
  }

  if (q?.trim()) {
    filter.$text = { $search: q.trim() };
  }

  const list = await PriceList.find(filter)
    .sort(filter.$text ? { score: { $meta: "textScore" } } : { createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

// GET BY ID (Admin)
export const adminGetPriceListById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { PriceList, PriceListItem } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const list = await PriceList.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!list) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }
  const items = await PriceListItem.find({ tenant: req.tenant, listId: list._id }).lean();

  res.status(200).json({ success: true, message: t("fetched"), data: { list, items } });
});

// DELETE (Admin)
export const deletePriceList = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { PriceList, PriceListItem } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const list = await PriceList.findOne({ _id: id, tenant: req.tenant });
  if (!list) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await PriceListItem.deleteMany({ tenant: req.tenant, listId: list._id });
  await list.deleteOne();

  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});

/* ===================== PRICE LIST ITEMS ===================== */

// CREATE ITEM
export const createPriceListItem = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { PriceList, PriceListItem } = await getTenantModels(req);
  const { listId } = req.params;

  if (!isValidObjectId(listId)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const list = await PriceList.findOne({ _id: listId, tenant: req.tenant });
  if (!list) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  try {
    const b = req.body;
    const item: Partial<IPriceListItem> = {
      tenant: req.tenant,
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
    if (err?.code === 11000) {
      res.status(409).json({ success: false, message: t("error.duplicate") });
      return;
    }
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "pricelistitem.create",
      module: "pricelist",
      status: "fail",
      error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// UPDATE ITEM
export const updatePriceListItem = asyncHandler(async (req: Request, res: Response) => {
  const { listId, itemId } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { PriceList, PriceListItem } = await getTenantModels(req);

  if (!isValidObjectId(listId) || !isValidObjectId(itemId)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const list = await PriceList.findOne({ _id: listId, tenant: req.tenant });
  if (!list) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const item = await PriceListItem.findOne({ _id: itemId, tenant: req.tenant, listId: list._id });
  if (!item) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

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
    if (err?.code === 11000) {
      res.status(409).json({ success: false, message: t("error.duplicate") });
      return;
    }
    logger.withReq.error(req, t("error.update_fail"), {
      ...getRequestContext(req),
      event: "pricelistitem.update",
      module: "pricelist",
      status: "fail",
      error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.update_fail") });
  }
});

// LIST ITEMS (Admin)
export const adminGetAllPriceListItems = asyncHandler(async (req: Request, res: Response) => {
  const { listId } = req.params;
  const { serviceCode, period, isActive } = req.query as Record<string, string>;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { PriceList, PriceListItem } = await getTenantModels(req);

  if (!isValidObjectId(listId)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const list = await PriceList.findOne({ _id: listId, tenant: req.tenant });
  if (!list) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const filter: Record<string, any> = { tenant: req.tenant, listId: list._id };
  if (serviceCode) filter.serviceCode = toUpperSnake(serviceCode);
  if (period) filter.period = period;
  if (typeof isActive === "string") filter.isActive = isActive === "true";

  const items = await PriceListItem.find(filter).sort({ createdAt: -1 }).lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: items.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: items });
});

// DELETE ITEM
export const deletePriceListItem = asyncHandler(async (req: Request, res: Response) => {
  const { listId, itemId } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { PriceListItem } = await getTenantModels(req);

  if (!isValidObjectId(listId) || !isValidObjectId(itemId)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const item = await PriceListItem.findOne({ _id: itemId, tenant: req.tenant, listId });
  if (!item) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await item.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id: itemId });
  res.status(200).json({ success: true, message: t("deleted") });
});
