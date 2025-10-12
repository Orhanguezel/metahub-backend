// src/modules/operation-template/admin.controller.ts
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

// CREATE
export const createOperationTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { OperationTemplate } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  try {
    const {
      code,
      name,
      description,
      serviceRef,
      defaultDurationMinutes,
      crew,
      steps,
      materials,
      safetyNotes,
      deliverables,
      recurrence,
      applicability,
      tags,
      version,
      isActive,
      deprecatedAt,
    } = req.body;

    const doc = await OperationTemplate.create({
      tenant: req.tenant,
      code,
      name,
      description,
      serviceRef: isValidObjectId(serviceRef) ? serviceRef : undefined,
      defaultDurationMinutes,
      crew,
      steps: Array.isArray(steps) ? steps : parseIfJson(steps) || [],
      materials: Array.isArray(materials) ? materials : parseIfJson(materials) || [],
      safetyNotes: Array.isArray(safetyNotes) ? safetyNotes : parseIfJson(safetyNotes) || [],
      deliverables: parseIfJson(deliverables),
      recurrence: parseIfJson(recurrence),
      applicability: parseIfJson(applicability),
      tags: Array.isArray(tags) ? tags : parseIfJson(tags) || [],
      version,
      isActive: isActive === undefined ? true : !!isActive,
      deprecatedAt,
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
    res.status(201).json({ success: true, message: t("created"), data: doc });
    return;
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "operationtemplate.create",
      status: "fail",
      error: err.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
    return;
  }
});

// UPDATE
export const updateOperationTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { OperationTemplate } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await OperationTemplate.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const payload = req.body;

  if (payload.code !== undefined) doc.code = payload.code;
  if (payload.name !== undefined) doc.name = payload.name;
  if (payload.description !== undefined) doc.description = payload.description;

  if (payload.serviceRef && isValidObjectId(payload.serviceRef)) doc.serviceRef = payload.serviceRef;
  if (payload.defaultDurationMinutes !== undefined) doc.defaultDurationMinutes = Number(payload.defaultDurationMinutes);
  if (payload.crew !== undefined) doc.crew = parseIfJson(payload.crew);

  if (payload.steps !== undefined) doc.steps = Array.isArray(payload.steps) ? payload.steps : parseIfJson(payload.steps) || [];
  if (payload.materials !== undefined) doc.materials = Array.isArray(payload.materials) ? payload.materials : parseIfJson(payload.materials) || [];
  if (payload.safetyNotes !== undefined) doc.safetyNotes = Array.isArray(payload.safetyNotes) ? payload.safetyNotes : parseIfJson(payload.safetyNotes) || [];
  if (payload.deliverables !== undefined) doc.deliverables = parseIfJson(payload.deliverables);
  if (payload.recurrence !== undefined) doc.recurrence = parseIfJson(payload.recurrence);
  if (payload.applicability !== undefined) doc.applicability = parseIfJson(payload.applicability);

  if (payload.tags !== undefined) doc.tags = Array.isArray(payload.tags) ? payload.tags : parseIfJson(payload.tags) || [];
  if (payload.version !== undefined) doc.version = Number(payload.version);
  if (payload.isActive !== undefined) doc.isActive = !!payload.isActive;
  if (payload.deprecatedAt !== undefined) doc.deprecatedAt = payload.deprecatedAt;

  await doc.save();

  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: doc });
  return;
});

// GET ALL (admin)
// src/modules/operation-template/admin.controller.ts

export const adminGetAllOperationTemplate = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { OperationTemplate } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  // --- Query parse (express-validator sonrası tipler: string | boolean | undefined) ---
  const {
    q,
    isActive,
    serviceRef,
    tag,
    categoryRef,
    apartmentRef,
    version,
    page = "1",
    limit = "200",
  } = req.query as {
    q?: string;
    isActive?: string | boolean;
    serviceRef?: string;
    tag?: string;
    categoryRef?: string;
    apartmentRef?: string;
    version?: string;
    page?: string | number;
    limit?: string | number;
  };

  // --- Filtre inşası ---
  const filter: Record<string, any> = { tenant: req.tenant };

  // isActive sadece GELİRSE uygula; gelmezse tüm kayıtlar (aktif+pasif)
  if (isActive !== undefined) {
    filter.isActive = typeof isActive === "string" ? isActive === "true" : !!isActive;
  }

  if (typeof serviceRef === "string" && isValidObjectId(serviceRef)) {
    filter.serviceRef = serviceRef;
  }
  if (typeof tag === "string" && tag.trim()) {
    // Array<string> alanında eleman eşleşmesi
    filter.tags = tag.trim();
  }
  if (typeof categoryRef === "string" && isValidObjectId(categoryRef)) {
    filter["applicability.categoryRefs"] = categoryRef;
  }
  if (typeof apartmentRef === "string" && isValidObjectId(apartmentRef)) {
    filter["applicability.apartmentRefs"] = apartmentRef;
  }
  if (typeof version === "string" && !Number.isNaN(Number(version))) {
    filter.version = Number(version);
  }

  if (typeof q === "string" && q.trim()) {
    const rx = new RegExp(q.trim(), "i");
    filter.$or = [
      { code: { $regex: rx } },
      { "name.en": { $regex: rx } },
      { "name.tr": { $regex: rx } },
    ];
  }

  // --- Sayfalama ---
  const pageNum = Math.max(Number(page) || 1, 1);
  const lim = Math.min(Number(limit) || 200, 500);
  const skip = (pageNum - 1) * lim;

  // --- Debug/İzleme log’u ---
  logger.withReq.info(req, "opstemplates.list.query", {
    ...getRequestContext(req),
    tenant: req.tenant,
    filter,
    page: pageNum,
    limit: lim,
  });

  // --- Sorgu ---
  const list = await OperationTemplate.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(lim)
    .lean();

  logger.withReq.info(req, t("listFetched"), {
    ...getRequestContext(req),
    resultCount: list.length,
  });

  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});



// GET BY ID (admin)
export const adminGetOperationTemplateById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { OperationTemplate } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await OperationTemplate.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
  return;
});

// DELETE
export const deleteOperationTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { OperationTemplate } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await OperationTemplate.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
  return;
});
