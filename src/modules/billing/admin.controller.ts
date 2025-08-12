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

/* ----------------- Helpers ----------------- */
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* ================== BILLING PLAN ================== */

// CREATE
export const createBillingPlan = asyncHandler(async (req: Request, res: Response) => {
  const { BillingPlan } = await getTenantModels(req);
  const t = tByReq(req);

  const payload = req.body;
  const doc = await BillingPlan.create({
    ...payload,
    tenant: req.tenant,
  });

  logger.withReq.info(req, t("plan.created"), {
    ...getRequestContext(req),
    id: doc._id,
    code: doc.code,
  });

  res.status(201).json({ success: true, message: t("plan.created"), data: doc });
});

// UPDATE (full/partial via PUT)
export const updateBillingPlan = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") }); return;
  }

  const { BillingPlan } = await getTenantModels(req);
  const plan = await BillingPlan.findOne({ _id: id, tenant: req.tenant });
  if (!plan) {
    res.status(404).json({ success: false, message: t("plan.notFound") }); return;
  }

  // güvenli alan güncellemeleri
  const up = req.body || {};
  if (up.source) plan.set("source", up.source);
  if (up.schedule) plan.set("schedule", up.schedule);
  if (typeof up.status === "string") plan.set("status", up.status);
  if (up.notes !== undefined) plan.set("notes", up.notes);
  if (Array.isArray(up.revisions)) plan.set("revisions", up.revisions);
  if (up.lastRunAt) plan.set("lastRunAt", up.lastRunAt);
  if (up.nextDueAt) plan.set("nextDueAt", up.nextDueAt);

  await plan.save();

  logger.withReq.info(req, t("plan.updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("plan.updated"), data: plan });
});

// STATUS transition (activate/pause/end)
export const changeBillingPlanStatus = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { status } = req.body as { status: "draft" | "active" | "paused" | "ended" };

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") }); return;
  }
  const { BillingPlan } = await getTenantModels(req);
  const plan = await BillingPlan.findOne({ _id: id, tenant: req.tenant });
  if (!plan) {
    res.status(404).json({ success: false, message: t("plan.notFound") }); return;
  }

  plan.status = status;
  await plan.save();

  logger.withReq.info(req, t("plan.statusChanged"), {
    ...getRequestContext(req),
    id,
    status,
  });
  res.status(200).json({ success: true, message: t("plan.statusChanged"), data: plan });
});

// GET list (admin)
export const adminGetBillingPlans = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { BillingPlan } = await getTenantModels(req);

  const {
    status,
    contract,
    apartment,
    customer,
    q,
    from,
    to,
    nextDueFrom,
    nextDueTo,
    limit = "200",
  } = req.query;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof status === "string") filter.status = status;
  if (typeof contract === "string" && isValidObjectId(contract)) filter["source.contract"] = contract;
  if (typeof apartment === "string" && isValidObjectId(apartment))
    filter["source.snapshots.apartment"] = apartment;
  if (typeof customer === "string" && isValidObjectId(customer))
    filter["source.snapshots.customer"] = customer;

  if (typeof q === "string" && q.trim()) {
    filter.$or = [
      { code: { $regex: q.trim(), $options: "i" } },
      { "source.snapshots.contractCode": { $regex: q.trim(), $options: "i" } },
    ];
  }

  if (typeof from === "string" || typeof to === "string") {
    filter["schedule.startDate"] = {};
    if (from) filter["schedule.startDate"].$gte = new Date(String(from));
    if (to) filter["schedule.startDate"].$lte = new Date(String(to));
  }

  if (typeof nextDueFrom === "string" || typeof nextDueTo === "string") {
    filter.nextDueAt = {};
    if (nextDueFrom) filter.nextDueAt.$gte = new Date(String(nextDueFrom));
    if (nextDueTo) filter.nextDueAt.$lte = new Date(String(nextDueTo));
  }

  const list = await BillingPlan.find(filter)
    .populate([
      { path: "source.contract", select: "code status startAt endAt" },
      { path: "source.snapshots.apartment", select: "title slug" },
      { path: "source.snapshots.customer", select: "companyName contactName" },
      { path: "source.snapshots.service", select: "code name" },
    ])
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("plan.listFetched"), {
    ...getRequestContext(req),
    resultCount: list.length,
  });
  res.status(200).json({ success: true, message: t("plan.listFetched"), data: list });
});

// GET by id (admin)
export const adminGetBillingPlanById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") }); return;
  }

  const { BillingPlan } = await getTenantModels(req);
  const doc = await BillingPlan.findOne({ _id: id, tenant: req.tenant })
    .populate([
      { path: "source.contract", select: "code status startAt endAt" },
      { path: "source.snapshots.apartment", select: "title slug" },
      { path: "source.snapshots.customer", select: "companyName contactName" },
      { path: "source.snapshots.service", select: "code name" },
    ])
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("plan.notFound") }); return;
  }
  res.status(200).json({ success: true, message: t("plan.fetched"), data: doc });
});

// DELETE
export const deleteBillingPlan = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") }); return;
  }

  const { BillingPlan, BillingOccurrence } = await getTenantModels(req);
  const plan = await BillingPlan.findOne({ _id: id, tenant: req.tenant });
  if (!plan) {
    res.status(404).json({ success: false, message: t("plan.notFound") }); return;
  }

  // ilişkili occurrence’ları da temizle (isteğe bağlı)
  await BillingOccurrence.deleteMany({ tenant: req.tenant, plan: plan._id });
  await plan.deleteOne();

  logger.withReq.info(req, t("plan.deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("plan.deleted") });
});

/* ================== OCCURRENCE ================== */

// CREATE (manual)
export const createBillingOccurrence = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { BillingOccurrence, BillingPlan } = await getTenantModels(req);

  const payload = req.body;
  // plan doğrulaması
  if (!payload.plan || !isValidObjectId(payload.plan)) {
    res.status(400).json({ success: false, message: t("occ.validation.planRequired") }); return;
  }
  const plan = await BillingPlan.findOne({ _id: payload.plan, tenant: req.tenant }).lean();
  if (!plan) {
    res.status(404).json({ success: false, message: t("plan.notFound") }); return;
  }

  // seq hesap (plan bazında max+1)
  const last = await BillingOccurrence.findOne({ tenant: req.tenant, plan: payload.plan })
    .sort({ seq: -1 })
    .lean();
  const nextSeq = (last?.seq || 0) + 1;

  const doc = await BillingOccurrence.create({
    ...payload,
    tenant: req.tenant,
    seq: payload.seq || nextSeq,
    currency: payload.currency || plan.schedule?.currency || "EUR",
    amount: payload.amount ?? plan.schedule?.amount,
  });

  logger.withReq.info(req, t("occ.created"), {
    ...getRequestContext(req),
    id: doc._id,
    plan: String(payload.plan),
    seq: doc.seq,
  });

  res.status(201).json({ success: true, message: t("occ.created"), data: doc });
});

// UPDATE
export const updateBillingOccurrence = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") }); return;
  }

  const { BillingOccurrence } = await getTenantModels(req);
  const occ = await BillingOccurrence.findOne({ _id: id, tenant: req.tenant });
  if (!occ) {
    res.status(404).json({ success: false, message: t("occ.notFound") }); return;
  }

  const up = req.body || {};
  ["windowStart", "windowEnd", "dueAt", "amount", "currency", "status", "invoice", "notes", "seq"]
    .forEach((k) => (up[k] !== undefined ? occ.set(k, up[k]) : null));

  await occ.save();

  logger.withReq.info(req, t("occ.updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("occ.updated"), data: occ });
});

// LIST
export const adminGetBillingOccurrences = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { BillingOccurrence } = await getTenantModels(req);

  const {
    status,
    plan,
    dueFrom,
    dueTo,
    seqFrom,
    seqTo,
    invoice,
    limit = "200",
  } = req.query;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof status === "string") filter.status = status;
  if (typeof plan === "string" && isValidObjectId(plan)) filter.plan = plan;
  if (typeof invoice === "string" && isValidObjectId(invoice)) filter.invoice = invoice;

  if (typeof dueFrom === "string" || typeof dueTo === "string") {
    filter.dueAt = {};
    if (dueFrom) filter.dueAt.$gte = new Date(String(dueFrom));
    if (dueTo) filter.dueAt.$lte = new Date(String(dueTo));
  }
  if (typeof seqFrom === "string" || typeof seqTo === "string") {
    filter.seq = {};
    if (seqFrom) filter.seq.$gte = Number(seqFrom);
    if (seqTo) filter.seq.$lte = Number(seqTo);
  }

  const list = await BillingOccurrence.find(filter)
    .populate([{ path: "plan", select: "code status schedule.period schedule.dueRule" }])
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ dueAt: 1, seq: 1 })
    .lean();

  logger.withReq.info(req, t("occ.listFetched"), {
    ...getRequestContext(req),
    resultCount: list.length,
  });
  res.status(200).json({ success: true, message: t("occ.listFetched"), data: list });
});

// GET by id
export const adminGetBillingOccurrenceById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") }); return;
  }

  const { BillingOccurrence } = await getTenantModels(req);
  const doc = await BillingOccurrence.findOne({ _id: id, tenant: req.tenant })
    .populate([{ path: "plan", select: "code status schedule.period schedule.dueRule" }])
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("occ.notFound") }); return;
  }
  res.status(200).json({ success: true, message: t("occ.fetched"), data: doc });
});

// DELETE
export const deleteBillingOccurrence = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") }); return;
  }

  const { BillingOccurrence } = await getTenantModels(req);
  const occ = await BillingOccurrence.findOne({ _id: id, tenant: req.tenant });
  if (!occ) {
    res.status(404).json({ success: false, message: t("occ.notFound") }); return;
  }

  await occ.deleteOne();

  logger.withReq.info(req, t("occ.deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("occ.deleted") });
});
