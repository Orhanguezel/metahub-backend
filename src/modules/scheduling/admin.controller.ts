import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { isValidObjectId } from "@/core/utils/validation";

const parseIfJson = (v: any) => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};

// CREATE
export const createSchedulePlan = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { SchedulePlan } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  try {
    const {
      code,
      title,
      description,
      anchor,
      timezone,
      pattern,
      window,
      policy,
      startDate,
      endDate,
      skipDates,
      blackouts,
      lastRunAt,
      nextRunAt,
      lastJobRef,
      status,
      tags,
    } = req.body;

    const doc = await SchedulePlan.create({
      tenant: req.tenant,
      code,
      title,
      description,
      anchor,
      timezone,
      pattern,
      window,
      policy,
      startDate,
      endDate,
      skipDates: Array.isArray(skipDates) ? skipDates : [],
      blackouts: Array.isArray(blackouts) ? blackouts : [],
      lastRunAt,
      nextRunAt,
      lastJobRef: isValidObjectId(lastJobRef) ? lastJobRef : undefined,
      status,
      tags: Array.isArray(tags) ? tags : [],
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
    res.status(201).json({ success: true, message: t("created"), data: doc });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "scheduleplan.create",
      status: "fail",
      error: err.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// UPDATE
export const updateSchedulePlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { SchedulePlan } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await SchedulePlan.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const payload = req.body;

  if (payload.code) doc.code = payload.code;
  if (payload.title) doc.title = payload.title;
  if (payload.description) doc.description = payload.description;

  if (payload.anchor) doc.anchor = parseIfJson(payload.anchor);
  if (payload.timezone !== undefined) doc.timezone = payload.timezone;
  if (payload.pattern) doc.pattern = parseIfJson(payload.pattern);
  if (payload.window) doc.window = parseIfJson(payload.window);
  if (payload.policy) doc.policy = parseIfJson(payload.policy);

  if (payload.startDate) doc.startDate = new Date(payload.startDate);
  if (payload.endDate !== undefined) doc.endDate = payload.endDate ? new Date(payload.endDate) : undefined;

  if (payload.skipDates) doc.skipDates = Array.isArray(payload.skipDates) ? payload.skipDates : parseIfJson(payload.skipDates);
  if (payload.blackouts) doc.blackouts = Array.isArray(payload.blackouts) ? payload.blackouts : parseIfJson(payload.blackouts);

  if (payload.lastRunAt !== undefined) doc.lastRunAt = payload.lastRunAt;
  if (payload.nextRunAt !== undefined) doc.nextRunAt = payload.nextRunAt;
  if (payload.lastJobRef && isValidObjectId(payload.lastJobRef)) doc.lastJobRef = payload.lastJobRef;

  if (payload.status) doc.status = payload.status;
  if (payload.tags) doc.tags = Array.isArray(payload.tags) ? payload.tags : parseIfJson(payload.tags);

  await doc.save();

  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: doc });
});

// LIST (admin)
export const adminGetAllSchedulePlan = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { SchedulePlan } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const {
    q,
    status,
    apartmentRef,
    serviceRef,
    templateRef,
    contractRef,
    tag,
    from,
    to,
    limit = "200",
  } = req.query;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof status === "string" && ["active", "paused", "archived"].includes(status)) {
    filter.status = status;
  }

  if (typeof apartmentRef === "string" && isValidObjectId(apartmentRef)) {
    filter["anchor.apartmentRef"] = apartmentRef;
  }
  if (typeof serviceRef === "string" && isValidObjectId(serviceRef)) {
    filter["anchor.serviceRef"] = serviceRef;
  }
  if (typeof templateRef === "string" && isValidObjectId(templateRef)) {
    filter["anchor.templateRef"] = templateRef;
  }
  if (typeof contractRef === "string" && isValidObjectId(contractRef)) {
    filter["anchor.contractRef"] = contractRef;
  }
  if (typeof tag === "string" && tag.trim()) {
    filter.tags = tag.trim();
  }
  if (typeof q === "string" && q.trim()) {
    filter.$or = [
      { code: { $regex: q.trim(), $options: "i" } },
      { "title.en": { $regex: q.trim(), $options: "i" } },
      { "title.tr": { $regex: q.trim(), $options: "i" } },
    ];
  }
  if (typeof from === "string" || typeof to === "string") {
    filter.startDate = {};
    if (from) (filter.startDate.$gte = new Date(String(from)));
    if (to) (filter.startDate.$lte = new Date(String(to)));
  }

  const list = await SchedulePlan.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .lean();

  logger.withReq.info(req, t("listFetched"), {
    ...getRequestContext(req),
    resultCount: list.length,
  });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

// DETAIL (admin)
export const adminGetSchedulePlanById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { SchedulePlan } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await SchedulePlan.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

// DELETE (admin)
export const deleteSchedulePlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { SchedulePlan } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await SchedulePlan.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
