import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { isValidObjectId } from "@/core/middleware/auth/validation";

const parseIfJson = (v: any) => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};

/* ------------------- Report Definitions ------------------- */

// CREATE
export const createReportDefinition = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ReportDefinition } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  try {
    const {
      code,
      name,
      kind,
      description,
      defaultFilters,
      view,
      exportFormats,
      schedule,
      isActive,
      tags,
      createdByRef,
      updatedByRef,
    } = req.body;

    const doc = await ReportDefinition.create({
      tenant: req.tenant,
      code,
      name,
      kind,
      description,
      defaultFilters: parseIfJson(defaultFilters),
      view: parseIfJson(view),
      exportFormats: Array.isArray(exportFormats) ? exportFormats : undefined,
      schedule: parseIfJson(schedule),
      isActive: isActive === undefined ? true : !!isActive,
      tags: Array.isArray(tags) ? tags : [],
      createdByRef: isValidObjectId(createdByRef) ? createdByRef : undefined,
      updatedByRef: isValidObjectId(updatedByRef) ? updatedByRef : undefined,
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
    res.status(201).json({ success: true, message: t("created"), data: doc });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "reports.definition.create",
      status: "fail",
      error: err.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// UPDATE
export const updateReportDefinition = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ReportDefinition } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await ReportDefinition.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const payload = req.body;
  if (payload.code) doc.code = payload.code;
  if (payload.name) doc.name = payload.name;
  if (payload.kind) doc.kind = payload.kind;
  if (payload.description !== undefined) doc.description = payload.description;

  if (payload.defaultFilters !== undefined) doc.defaultFilters = parseIfJson(payload.defaultFilters);
  if (payload.view !== undefined) doc.view = parseIfJson(payload.view);
  if (payload.exportFormats !== undefined)
    doc.exportFormats = Array.isArray(payload.exportFormats) ? payload.exportFormats : [];
  if (payload.schedule !== undefined) doc.schedule = parseIfJson(payload.schedule);

  if (payload.isActive !== undefined) doc.isActive = !!payload.isActive;
  if (payload.tags !== undefined) doc.tags = Array.isArray(payload.tags) ? payload.tags : [];

  if (payload.createdByRef && isValidObjectId(payload.createdByRef)) doc.createdByRef = payload.createdByRef;
  if (payload.updatedByRef && isValidObjectId(payload.updatedByRef)) doc.updatedByRef = payload.updatedByRef;

  await doc.save();

  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: doc });
});

// GET ALL (admin)
export const adminGetAllReportDefinitions = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ReportDefinition } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const { q, kind, isActive, tag, limit = "200" } = req.query;
  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof kind === "string" && kind) filter.kind = kind;
  filter.isActive = typeof isActive === "string" ? isActive === "true" : true;
  if (typeof tag === "string" && tag.trim()) filter.tags = tag.trim();

  if (typeof q === "string" && q.trim()) {
    filter.$or = [
      { code: { $regex: q.trim(), $options: "i" } },
      { name: { $regex: q.trim(), $options: "i" } },
      { description: { $regex: q.trim(), $options: "i" } },
    ];
  }

  const list = await ReportDefinition.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

// GET BY ID (admin)
export const adminGetReportDefinitionById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ReportDefinition } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await ReportDefinition.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

// DELETE
export const deleteReportDefinition = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ReportDefinition } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await ReportDefinition.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});

/* ------------------- Report Runs ------------------- */

// CREATE RUN (manual trigger / snapshot)
export const createReportRun = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ReportRun, ReportDefinition } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  try {
    const { definitionRef, kind, triggeredBy = "manual", filtersUsed } = req.body;

    let finalKind = kind;
    let defId;
    if (definitionRef && isValidObjectId(definitionRef)) {
      const def = await ReportDefinition.findOne({ _id: definitionRef, tenant: req.tenant }).lean();
      if (!def) {
        res.status(400).json({ success: false, message: t("invalidDefinition") });
        return;
      }
      defId = def._id;
      finalKind = def.kind;
    }
    if (!finalKind) {
      res.status(400).json({ success: false, message: t("kindRequired") });
      return;
    }

    const now = new Date();
    const run = await ReportRun.create({
      tenant: req.tenant,
      definitionRef: defId,
      kind: finalKind,
      code: undefined, // pre-validate hook üretir
      triggeredBy,
      startedAt: undefined,
      finishedAt: undefined,
      status: "queued",
      durationMs: undefined,
      filtersUsed: parseIfJson(filtersUsed),
      rowCount: 0,
      bytes: 0,
      files: [],
      previewSample: [],
      error: undefined,
    });

    logger.withReq.info(req, t("runQueued"), { ...getRequestContext(req), id: run._id, kind: finalKind });
    res.status(201).json({ success: true, message: t("runQueued"), data: run });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "reports.run.create",
      status: "fail",
      error: err.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// GET ALL RUNS (admin)
export const adminGetAllReportRuns = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ReportRun } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const { kind, status, definitionRef, from, to, q, limit = "200" } = req.query;
  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof kind === "string" && kind) filter.kind = kind;
  if (typeof status === "string" && status) filter.status = status;
  if (typeof definitionRef === "string" && isValidObjectId(definitionRef)) filter.definitionRef = definitionRef;

  // tarih aralığı (startedAt)
  const gte = typeof from === "string" ? new Date(from) : undefined;
  const lte = typeof to === "string" ? new Date(to) : undefined;
  if (gte || lte) {
    filter.startedAt = {};
    if (gte) filter.startedAt.$gte = gte;
    if (lte) filter.startedAt.$lte = lte;
  }

  if (typeof q === "string" && q.trim()) {
    filter.$or = [
      { code: { $regex: q.trim(), $options: "i" } },
      { error: { $regex: q.trim(), $options: "i" } },
    ];
  }

  const list = await ReportRun.find(filter)
    .sort({ startedAt: -1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

// GET RUN BY ID (admin)
export const adminGetReportRunById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ReportRun } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await ReportRun.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

// DELETE RUN
export const deleteReportRun = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ReportRun } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await ReportRun.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
