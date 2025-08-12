import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

// LIST public (only active + within effective window + status active)
export const getAllPriceListsPublic = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { PriceList } = await getTenantModels(req);

  const { region, segment, onDate } = req.query as Record<string, string>;
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

  const list = await PriceList.find(filter).sort({ createdAt: -1 }).lean();

  logger.withReq.info(req, t("log.listed"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("log.listed"), data: list });
});

// GET by code (public)
export const getPriceListByCodePublic = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
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

  if (!list) {
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const items = await PriceListItem.find({
    tenant: req.tenant,
    listId: list._id,
    isActive: true,
  }).lean();

  res.status(200).json({ success: true, message: t("log.fetched"), data: { list, items } });
});

// Quick lookup price for a service
// GET /pricelists/code/:code/price?serviceCode=TRASH&period=monthly
export const getPriceForServicePublic = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
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

  if (!list) {
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const item = await PriceListItem.findOne({
    tenant: req.tenant,
    listId: list._id,
    serviceCode,
    period,
    isActive: true,
  }).lean();

  if (!item) {
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  res.status(200).json({
    success: true,
    message: t("log.fetched"),
    data: { amount: item.amount, currency: item.currency || list.defaultCurrency, period: item.period },
  });
});
