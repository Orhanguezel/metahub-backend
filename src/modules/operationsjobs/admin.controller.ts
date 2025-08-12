import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

// --- helpers ---
const parseIfJson = (v: any) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return v;
  }
};

// CREATE
export const adminCreateJob = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { OperationJob } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const {
    code, // opsiyonel: boşsa hook üretecek
    title,
    description,
    source,
    templateRef,
    serviceRef,
    contractRef,
    apartmentRef,
    categoryRef,
    status,
    schedule,
    expectedDurationMinutes,
    actualDurationMinutes,
    assignments,
    steps,
    materials,
    deliverables,
    finance,
    priority,
    tags,
    isActive,
  } = req.body;

  try {
    const doc = await OperationJob.create({
      tenant: req.tenant,
      code,
      title: parseIfJson(title) || {},
      description: parseIfJson(description) || {},
      source,
      templateRef: isValidObjectId(templateRef) ? templateRef : undefined,
      serviceRef: isValidObjectId(serviceRef) ? serviceRef : undefined,
      contractRef: isValidObjectId(contractRef) ? contractRef : undefined,
      apartmentRef, // create validator zaten kontrol ediyor
      categoryRef: isValidObjectId(categoryRef) ? categoryRef : undefined,
      status,
      schedule: parseIfJson(schedule) || {},
      expectedDurationMinutes:
        expectedDurationMinutes !== undefined ? Number(expectedDurationMinutes) : undefined,
      actualDurationMinutes:
        actualDurationMinutes !== undefined ? Number(actualDurationMinutes) : undefined,
      assignments: parseIfJson(assignments) || [],
      steps: parseIfJson(steps) || [],
      materials: parseIfJson(materials) || [],
      deliverables: parseIfJson(deliverables) || undefined,
      finance: parseIfJson(finance) || undefined,
      priority: priority || "normal",
      tags: Array.isArray(tags) ? tags : parseIfJson(tags) || [],
      isActive: isActive === undefined ? true : isActive === true || isActive === "true",
    });

    logger.withReq.info(req, t("created"), {
      ...getRequestContext(req),
      id: doc._id,
      code: doc.code,
    });

    res.status(201).json({ success: true, message: t("created"), data: doc });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "operationjob.create",
      module: "operations-jobs",
      error: err.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// UPDATE
export const adminUpdateJob = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { id } = req.params;
  const { OperationJob } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const job = await OperationJob.findOne({ _id: id, tenant: req.tenant });
  if (!job) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const payload = req.body;

  if (payload.code) job.code = String(payload.code).trim();
  if (payload.title) job.title = parseIfJson(payload.title);
  if (payload.description) job.description = parseIfJson(payload.description);
  if (payload.source) job.source = payload.source;
  if (payload.templateRef && isValidObjectId(payload.templateRef)) job.templateRef = payload.templateRef;
  if (payload.serviceRef && isValidObjectId(payload.serviceRef)) job.serviceRef = payload.serviceRef;
  if (payload.contractRef && isValidObjectId(payload.contractRef)) job.contractRef = payload.contractRef;
  if (payload.apartmentRef && isValidObjectId(payload.apartmentRef)) job.apartmentRef = payload.apartmentRef;
  if (payload.categoryRef && isValidObjectId(payload.categoryRef)) job.categoryRef = payload.categoryRef;
  if (payload.status) job.status = payload.status;

  if (payload.schedule) job.schedule = parseIfJson(payload.schedule);
  if (payload.expectedDurationMinutes !== undefined)
    job.expectedDurationMinutes = Number(payload.expectedDurationMinutes);
  if (payload.actualDurationMinutes !== undefined)
    job.actualDurationMinutes = Number(payload.actualDurationMinutes);

  if (payload.assignments) job.assignments = parseIfJson(payload.assignments) || [];
  if (payload.steps) job.steps = parseIfJson(payload.steps) || [];
  if (payload.materials) job.materials = parseIfJson(payload.materials) || [];
  if (payload.deliverables) job.deliverables = parseIfJson(payload.deliverables);
  if (payload.finance) job.finance = parseIfJson(payload.finance);

  if (payload.priority) job.priority = payload.priority;
  if (payload.tags) job.tags = Array.isArray(payload.tags) ? payload.tags : parseIfJson(payload.tags) || [];
  if (payload.isActive !== undefined)
    job.isActive = payload.isActive === true || payload.isActive === "true";

  await job.save();

  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id: job._id, code: job.code });
  res.status(200).json({ success: true, message: t("updated"), data: job });
});

// GET ALL (admin, filtreli)
export const adminGetAllJobs = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { OperationJob } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const {
    status,
    source,
    apartment,
    service,
    contract,
    employee,
    priority,
    code,
    q,
    plannedFrom,
    plannedTo,
    dueFrom,
    dueTo,
    isActive,
    limit = "50",
    page = "1",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (status) filter.status = status;
  if (source) filter.source = source;
  if (priority) filter.priority = priority;
  if (typeof isActive === "string") filter.isActive = isActive === "true";

  if (apartment && isValidObjectId(apartment)) filter.apartmentRef = apartment;
  if (service && isValidObjectId(service)) filter.serviceRef = service;
  if (contract && isValidObjectId(contract)) filter.contractRef = contract;
  if (employee && isValidObjectId(employee))
    filter["assignments.employeeRef"] = employee;

  if (code) filter.code = { $regex: code.trim(), $options: "i" };
  if (q && q.trim()) {
    filter.$or = [
      { code: { $regex: q.trim(), $options: "i" } },
      { "title.en": { $regex: q.trim(), $options: "i" } },
      { "title.tr": { $regex: q.trim(), $options: "i" } },
    ];
  }

  // date windows
  const planned: any = {};
  if (plannedFrom) planned.$gte = new Date(plannedFrom);
  if (plannedTo) planned.$lte = new Date(plannedTo);
  if (Object.keys(planned).length) filter["schedule.plannedStart"] = planned;

  const due: any = {};
  if (dueFrom) due.$gte = new Date(dueFrom);
  if (dueTo) due.$lte = new Date(dueTo);
  if (Object.keys(due).length) filter["schedule.dueAt"] = due;

  const pageNum = Math.max(1, Number(page) || 1);
  const lim = Math.min(200, Math.max(1, Number(limit) || 50));
  const skip = (pageNum - 1) * lim;

  const [items, total] = await Promise.all([
    OperationJob.find(filter)
      .populate([
        { path: "apartmentRef", select: "title slug address" },
        { path: "categoryRef", select: "name slug" },
        { path: "serviceRef", select: "name code" },
        { path: "contractRef", select: "code status" },
        { path: "assignments.employeeRef", select: "name email" },
        { path: "finance.invoiceRef", select: "code status totals.grandTotal" },
      ])
      .sort({ "schedule.plannedStart": -1, createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean(),
    OperationJob.countDocuments(filter),
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
    meta: { total, page: pageNum, limit: lim },
  });
});

// GET BY ID
export const adminGetJobById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { id } = req.params;
  const { OperationJob } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await OperationJob.findOne({ _id: id, tenant: req.tenant })
    .populate([
      { path: "apartmentRef", select: "title slug address" },
      { path: "categoryRef", select: "name slug" },
      { path: "serviceRef", select: "name code" },
      { path: "contractRef", select: "code status" },
      { path: "assignments.employeeRef", select: "name email" },
      { path: "finance.invoiceRef", select: "code status totals.grandTotal" },
    ])
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

// DELETE
export const adminDeleteJob = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { id } = req.params;
  const { OperationJob } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await OperationJob.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();

  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
