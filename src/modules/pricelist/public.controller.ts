import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* ===================== PUBLIC: Price Lists ===================== */

// LIST public (only active + within effective window + status active)
export const getAllPriceListsPublic = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceList } = await getTenantModels(req);

  const { region, segment, onDate, limit = "50" } = req.query as Record<string, string>;
  const now = onDate ? new Date(onDate) : new Date();

  const filter: Record<string, any> = {
    tenant: req.tenant,
    isActive: true,
    status: "active",
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }],
  };

  if (region) filter.region = region;
  if (segment) filter.segment = segment;

  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
  const list = await PriceList.find(filter).sort({ createdAt: -1 }).limit(lim).lean();

  logger.withReq.info(req, t("log.listed"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("log.listed"), data: list });
});

// GET by code (with items)
export const getPriceListByCodePublic = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceList, PriceListItem } = await getTenantModels(req);

  const code = toUpperSnake(req.params.code);
  const now = req.query.onDate ? new Date(String(req.query.onDate)) : new Date();

  const list = await PriceList.findOne({
    tenant: req.tenant,
    code,
    isActive: true,
    status: "active",
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }],
  }).lean();

  if (!list) { res.status(404).json({ success: false, message: t("error.not_found") }); return; }

  const items = await PriceListItem.find({
    tenant: req.tenant,
    listId: list._id,
    isActive: true,
    kind: "list",
  }).lean();

  res.status(200).json({ success: true, message: t("log.fetched"), data: { list, items } });
});

// Quick lookup price for a service
// GET /pricelists/code/:code/price?serviceCode=TRASH&period=monthly
export const getPriceForServicePublic = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceList, PriceListItem } = await getTenantModels(req);

  const code = toUpperSnake(req.params.code);
  const serviceCode = toUpperSnake(String(req.query.serviceCode || ""));
  const period = String(req.query.period || "");
  if (!serviceCode || !period) {
    res.status(400).json({ success: false, message: t("error.invalid_params") });
    return;
  }

  const now = req.query.onDate ? new Date(String(req.query.onDate)) : new Date();

  const list = await PriceList.findOne({
    tenant: req.tenant,
    code,
    isActive: true,
    status: "active",
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }],
  }).lean();
  if (!list) { res.status(404).json({ success: false, message: t("error.not_found") }); return; }

  const item = await PriceListItem.findOne({
    tenant: req.tenant,
    listId: list._id,
    serviceCode,
    period,
    isActive: true,
    kind: "list",
  }).lean();

  if (!item) { res.status(404).json({ success: false, message: t("error.not_found") }); return; }

  res.status(200).json({
    success: true,
    message: t("log.fetched"),
    data: { amount: item.amount, currency: item.currency || list.defaultCurrency, period: item.period },
  });
});

/* ===================== PUBLIC: Catalog Items ===================== */

// GET /pricelists/catalog?codes=a,b&category=menuitem_modifier&validOn=2025-08-23&tags=vegan,spicy
export const publicGetCatalogItems = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceListItem } = await getTenantModels(req);

  const { codes, category, tags, validOn, q, limit = "100" } = req.query as Record<string, string>;
  const filter: Record<string, any> = {
    tenant: req.tenant,
    kind: "catalog",
    isActive: true,
  };

  if (category) filter.category = category;
  if (codes) {
    const codeList = codes.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    if (codeList.length) filter.code = { $in: codeList };
  }
  if (tags) {
    const arr = tags.split(",").map(s => s.trim()).filter(Boolean);
    if (arr.length) filter.tags = { $all: arr };
  }
  if (validOn) {
    const d = new Date(validOn);
    filter.$and = [
      { $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: d } }] },
      { $or: [{ validTo: { $exists: false } }, { validTo: { $gte: d } }] },
    ];
  }
  if (q?.trim()) {
    const rx = new RegExp(q.trim(), "i");
    const nameOrs = SUPPORTED_LOCALES.map(l => ({ [`name.${l}`]: rx }));
    filter.$or = [{ code: rx }, ...nameOrs];
  }

  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 500);
  const list = await PriceListItem.find(filter)
    .select("code name description category price currency validFrom validTo tags")
    .sort({ createdAt: -1 })
    .limit(lim)
    .lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: list.length, public: true });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

// GET /pricelists/catalog/:code
export const publicGetCatalogItemByCode = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PriceListItem } = await getTenantModels(req);

  const code = String(req.params.code || "").toLowerCase();
  const now = req.query.onDate ? new Date(String(req.query.onDate)) : new Date();

  const doc = await PriceListItem.findOne({
    tenant: req.tenant,
    kind: "catalog",
    code,
    isActive: true,
    $and: [
      { $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
      { $or: [{ validTo: { $exists: false } }, { validTo: { $gte: now } }] },
    ],
  })
    .select("code name description category price currency validFrom validTo tags source")
    .lean();

  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
