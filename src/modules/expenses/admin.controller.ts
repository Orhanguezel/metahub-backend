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

// Admin: Create
export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Expense } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  try {
    const {
      code,
      type,
      vendorRef,
      employeeRef,
      apartmentRef,
      jobRef,
      expenseDate,
      dueDate,
      postedAt,
      currency,
      baseCurrency,
      fxRate,
      lines,
      reimbursable,
      reimbursementStatus,
      status,
      vendorBillNo,
      notes,
      internalNote,
      attachments,
      approvals,
      tags,
      paymentRefs,
      paidAmount,
    } = req.body;

    const doc = await Expense.create({
      tenant: req.tenant,
      code,
      type,
      vendorRef: isValidObjectId(vendorRef) ? vendorRef : undefined,
      employeeRef: isValidObjectId(employeeRef) ? employeeRef : undefined,
      apartmentRef: isValidObjectId(apartmentRef) ? apartmentRef : undefined,
      jobRef: isValidObjectId(jobRef) ? jobRef : undefined,

      expenseDate,
      dueDate,
      postedAt,

      currency,
      baseCurrency,
      fxRate,

      lines: Array.isArray(lines) ? lines : parseIfJson(lines) || [],
      reimbursable: !!reimbursable,
      reimbursementStatus,
      status,
      vendorBillNo,
      notes,
      internalNote,
      attachments: Array.isArray(attachments) ? attachments : parseIfJson(attachments) || [],
      approvals: Array.isArray(approvals) ? approvals : parseIfJson(approvals) || [],
      tags: Array.isArray(tags) ? tags : parseIfJson(tags) || [],

      paymentRefs: Array.isArray(paymentRefs) ? paymentRefs : parseIfJson(paymentRefs) || [],
      paidAmount,
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id, module: "expense" });
    res.status(201).json({ success: true, message: t("created"), data: doc });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "expense.create",
      error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// Admin: Update
export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { Expense } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
  } else {
    const doc = await Expense.findOne({ _id: id, tenant: req.tenant });
    if (!doc) {
      res.status(404).json({ success: false, message: t("notFound") });
    } else {
      const payload = req.body;

      if (payload.code) doc.code = payload.code;
      if (payload.type) doc.type = payload.type;

      if (isValidObjectId(payload.vendorRef)) doc.vendorRef = payload.vendorRef;
      if (isValidObjectId(payload.employeeRef)) doc.employeeRef = payload.employeeRef;
      if (isValidObjectId(payload.apartmentRef)) doc.apartmentRef = payload.apartmentRef;
      if (isValidObjectId(payload.jobRef)) doc.jobRef = payload.jobRef;

      if (payload.expenseDate) doc.expenseDate = payload.expenseDate;
      if (payload.dueDate !== undefined) doc.dueDate = payload.dueDate;
      if (payload.postedAt !== undefined) doc.postedAt = payload.postedAt;

      if (payload.currency) doc.currency = payload.currency;
      if (payload.baseCurrency !== undefined) doc.baseCurrency = payload.baseCurrency;
      if (payload.fxRate !== undefined) doc.fxRate = Number(payload.fxRate);

      if (payload.lines !== undefined) doc.lines = Array.isArray(payload.lines) ? payload.lines : parseIfJson(payload.lines) || [];

      if (payload.reimbursable !== undefined) doc.reimbursable = !!payload.reimbursable;
      if (payload.reimbursementStatus) doc.reimbursementStatus = payload.reimbursementStatus;
      if (payload.status) doc.status = payload.status;

      if (payload.vendorBillNo !== undefined) doc.vendorBillNo = payload.vendorBillNo;
      if (payload.notes !== undefined) doc.notes = payload.notes;
      if (payload.internalNote !== undefined) doc.internalNote = payload.internalNote;

      if (payload.attachments !== undefined)
        doc.attachments = Array.isArray(payload.attachments) ? payload.attachments : parseIfJson(payload.attachments) || [];

      if (payload.approvals !== undefined)
        doc.approvals = Array.isArray(payload.approvals) ? payload.approvals : parseIfJson(payload.approvals) || [];

      if (payload.tags !== undefined)
        doc.tags = Array.isArray(payload.tags) ? payload.tags : parseIfJson(payload.tags) || [];

      if (payload.paymentRefs !== undefined)
        doc.paymentRefs = Array.isArray(payload.paymentRefs) ? payload.paymentRefs : parseIfJson(payload.paymentRefs) || [];

      if (payload.paidAmount !== undefined) doc.paidAmount = Number(payload.paidAmount);

      await doc.save();
      logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
      res.status(200).json({ success: true, message: t("updated"), data: doc });
    }
  }
});

// Admin: List
export const adminGetAllExpense = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Expense } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const {
    q,
    type,
    status,
    vendorRef,
    employeeRef,
    apartmentRef,
    jobRef,
    dateFrom,
    dateTo,
    reimbursable,
    reimbursementStatus,
    limit = "200",
  } = req.query;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof type === "string") filter.type = type;
  if (typeof status === "string") filter.status = status;

  if (typeof reimbursementStatus === "string") filter.reimbursementStatus = reimbursementStatus;
  if (typeof reimbursable === "string") filter.reimbursable = reimbursable === "true";

  if (typeof vendorRef === "string" && isValidObjectId(vendorRef)) filter.vendorRef = vendorRef;
  if (typeof employeeRef === "string" && isValidObjectId(employeeRef)) filter.employeeRef = employeeRef;
  if (typeof apartmentRef === "string" && isValidObjectId(apartmentRef)) filter.apartmentRef = apartmentRef;
  if (typeof jobRef === "string" && isValidObjectId(jobRef)) filter.jobRef = jobRef;

  if (typeof dateFrom === "string" || typeof dateTo === "string") {
    filter.expenseDate = {};
    if (dateFrom) filter.expenseDate.$gte = new Date(String(dateFrom));
    if (dateTo) filter.expenseDate.$lte = new Date(String(dateTo));
  }

  if (typeof q === "string" && q.trim()) {
    filter.$or = [
      { code: { $regex: q.trim(), $options: "i" } },
      { vendorBillNo: { $regex: q.trim(), $options: "i" } },
      { notes: { $regex: q.trim(), $options: "i" } },
      { internalNote: { $regex: q.trim(), $options: "i" } },
    ];
  }

  const list = await Expense.find(filter)
    .sort({ expenseDate: -1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .lean();

  logger.withReq.info(req, t("listFetched"), {
    ...getRequestContext(req),
    resultCount: list.length,
  });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

// Admin: Get by id
export const adminGetExpenseById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Expense } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
  } else {
    const doc = await Expense.findOne({ _id: id, tenant: req.tenant }).lean();
    if (!doc) {
      res.status(404).json({ success: false, message: t("notFound") });
    } else {
      res.status(200).json({ success: true, message: t("fetched"), data: doc });
    }
  }
});

// Admin: Delete
export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Expense } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
  } else {
    const doc = await Expense.findOne({ _id: id, tenant: req.tenant });
    if (!doc) {
      res.status(404).json({ success: false, message: t("notFound") });
    } else {
      await doc.deleteOne();
      logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
      res.status(200).json({ success: true, message: t("deleted") });
    }
  }
});
