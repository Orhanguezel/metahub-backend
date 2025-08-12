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
export const createTimeEntry = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { TimeEntry } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  try {
    const payload = req.body;

    const doc = await TimeEntry.create({
      tenant: req.tenant,
      code: payload.code,
      employeeRef: payload.employeeRef,
      jobRef: isValidObjectId(payload.jobRef) ? payload.jobRef : undefined,
      shiftRef: isValidObjectId(payload.shiftRef) ? payload.shiftRef : undefined,
      serviceRef: isValidObjectId(payload.serviceRef) ? payload.serviceRef : undefined,
      apartmentRef: isValidObjectId(payload.apartmentRef) ? payload.apartmentRef : undefined,

      date: payload.date,
      clockInAt: payload.clockInAt,
      clockOutAt: payload.clockOutAt,

      geoIn: payload.geoIn ? parseIfJson(payload.geoIn) : undefined,
      geoOut: payload.geoOut ? parseIfJson(payload.geoOut) : undefined,
      deviceIn: payload.deviceIn ? parseIfJson(payload.deviceIn) : undefined,
      deviceOut: payload.deviceOut ? parseIfJson(payload.deviceOut) : undefined,

      breaks: Array.isArray(payload.breaks) ? payload.breaks : [],
      notes: payload.notes,

      payCode: payload.payCode ? parseIfJson(payload.payCode) : undefined,
      rounding: payload.rounding ? parseIfJson(payload.rounding) : undefined,

      costRateSnapshot: payload.costRateSnapshot,
      billRateSnapshot: payload.billRateSnapshot,

      minutesWorked: payload.minutesWorked,
      minutesBreaks: payload.minutesBreaks,
      minutesPaid: payload.minutesPaid,
      overtimeMinutes: payload.overtimeMinutes,

      costAmount: payload.costAmount,
      billAmount: payload.billAmount,

      status: payload.status ?? "open",
      approvals: Array.isArray(payload.approvals) ? payload.approvals : [],

      exportBatchId: payload.exportBatchId,
      source: payload.source ?? "manual",
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
    res.status(201).json({ success: true, message: t("created"), data: doc });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "timeentry.create",
      status: "fail",
      error: err.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// UPDATE
export const updateTimeEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { TimeEntry } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await TimeEntry.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const p = req.body;

  if (p.code) doc.code = p.code;
  if (p.employeeRef && isValidObjectId(p.employeeRef)) (doc as any).employeeRef = p.employeeRef;
  if (p.jobRef && isValidObjectId(p.jobRef)) (doc as any).jobRef = p.jobRef;
  if (p.shiftRef && isValidObjectId(p.shiftRef)) (doc as any).shiftRef = p.shiftRef;
  if (p.serviceRef && isValidObjectId(p.serviceRef)) (doc as any).serviceRef = p.serviceRef;
  if (p.apartmentRef && isValidObjectId(p.apartmentRef)) (doc as any).apartmentRef = p.apartmentRef;

  if (p.date) (doc as any).date = p.date;
  if (p.clockInAt !== undefined) (doc as any).clockInAt = p.clockInAt || undefined;
  if (p.clockOutAt !== undefined) (doc as any).clockOutAt = p.clockOutAt || undefined;

  if (p.geoIn !== undefined) (doc as any).geoIn = p.geoIn ? parseIfJson(p.geoIn) : undefined;
  if (p.geoOut !== undefined) (doc as any).geoOut = p.geoOut ? parseIfJson(p.geoOut) : undefined;
  if (p.deviceIn !== undefined) (doc as any).deviceIn = p.deviceIn ? parseIfJson(p.deviceIn) : undefined;
  if (p.deviceOut !== undefined) (doc as any).deviceOut = p.deviceOut ? parseIfJson(p.deviceOut) : undefined;

  if (p.breaks) (doc as any).breaks = Array.isArray(p.breaks) ? p.breaks : parseIfJson(p.breaks);
  if (p.notes !== undefined) (doc as any).notes = p.notes;

  if (p.payCode !== undefined) (doc as any).payCode = p.payCode ? parseIfJson(p.payCode) : undefined;
  if (p.rounding !== undefined) (doc as any).rounding = p.rounding ? parseIfJson(p.rounding) : undefined;

  if (p.costRateSnapshot !== undefined) (doc as any).costRateSnapshot = p.costRateSnapshot;
  if (p.billRateSnapshot !== undefined) (doc as any).billRateSnapshot = p.billRateSnapshot;

  if (p.minutesWorked !== undefined) (doc as any).minutesWorked = p.minutesWorked;
  if (p.minutesBreaks !== undefined) (doc as any).minutesBreaks = p.minutesBreaks;
  if (p.minutesPaid !== undefined) (doc as any).minutesPaid = p.minutesPaid;
  if (p.overtimeMinutes !== undefined) (doc as any).overtimeMinutes = p.overtimeMinutes;

  if (p.costAmount !== undefined) (doc as any).costAmount = p.costAmount;
  if (p.billAmount !== undefined) (doc as any).billAmount = p.billAmount;

  if (p.status) (doc as any).status = p.status;
  if (p.approvals) (doc as any).approvals = Array.isArray(p.approvals) ? p.approvals : parseIfJson(p.approvals);

  if (p.exportBatchId !== undefined) (doc as any).exportBatchId = p.exportBatchId;
  if (p.source !== undefined) (doc as any).source = p.source;

  await doc.save();

  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: doc });
});

// GET ALL (admin)
export const adminGetAllTimeEntry = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { TimeEntry } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const {
    employeeRef,
    jobRef,
    apartmentRef,
    serviceRef,
    status,
    dateFrom,
    dateTo,
    exportBatchId,
    page = "1",
    limit = "50",
    sort = "date",
    order = "desc",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (employeeRef && isValidObjectId(employeeRef)) filter.employeeRef = employeeRef;
  if (jobRef && isValidObjectId(jobRef)) filter.jobRef = jobRef;
  if (apartmentRef && isValidObjectId(apartmentRef)) filter.apartmentRef = apartmentRef;
  if (serviceRef && isValidObjectId(serviceRef)) filter.serviceRef = serviceRef;
  if (status) filter.status = status;
  if (exportBatchId) filter.exportBatchId = exportBatchId;

  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }

  const pageNum = Math.max(1, parseInt(page || "1", 10));
  const limitNum = Math.min(500, Math.max(1, parseInt(limit || "50", 10)));
  const skip = (pageNum - 1) * limitNum;

  const sortMap: Record<string, any> = {
    date: { date: order === "asc" ? 1 : -1 },
    createdAt: { createdAt: order === "asc" ? 1 : -1 },
    updatedAt: { updatedAt: order === "asc" ? 1 : -1 },
    clockInAt: { clockInAt: order === "asc" ? 1 : -1 },
  };

  const sortObj = sortMap[sort] || sortMap.date;

  const [items, total] = await Promise.all([
    TimeEntry.find(filter).sort(sortObj).skip(skip).limit(limitNum).lean(),
    TimeEntry.countDocuments(filter),
  ]);

  logger.withReq.info(req, t("listFetched"), {
    ...getRequestContext(req),
    resultCount: items.length,
    total,
  });
  res.status(200).json({
    success: true,
    message: t("listFetched"),
    data: items,
    meta: { page: pageNum, limit: limitNum, total },
  });
});

// GET BY ID (admin)
export const adminGetTimeEntryById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { TimeEntry } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await TimeEntry.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

// DELETE
export const deleteTimeEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { TimeEntry } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await TimeEntry.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();

  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
