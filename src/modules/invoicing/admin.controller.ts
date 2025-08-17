// modules/invoicing/admin.controller.ts (güncel öneri)
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { isValidObjectId } from "@/core/utils/validation";
import type { SupportedLocale } from "@/types/common";
import type { InvoiceStatus } from "./types";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, ((req as any).locale as SupportedLocale) || getLogLocale(), translations, p);

/* ================== CREATE ================== */
export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { Invoice } = await getTenantModels(req);
  const t = tByReq(req);

  const payload = req.body ?? {};
  const doc = await Invoice.create({
    ...payload,
    tenant: req.tenant,
  });

  logger.withReq.info(req, t("messages.created"), {
    ...getRequestContext(req),
    id: doc._id,
    code: (doc as any).code,
  });

  res.status(201).json({ success: true, message: t("messages.created"), data: doc });
});

/* ================== UPDATE ================== */
export const updateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Invoice } = await getTenantModels(req);
  const inv = await Invoice.findOne({ _id: id, tenant: req.tenant });
  if (!inv) {
    res.status(404).json({ success: false, message: t("messages.notFound") });
    return;
  }

  // Draft dışındakileri kilitlemek istersen guard ekleyebilirsin

  const up = req.body || {};
  const updatableKeys: Array<
    | "type" | "status" | "issueDate" | "dueDate" | "periodStart" | "periodEnd"
    | "seller" | "buyer" | "links" | "items" | "invoiceDiscount" | "totals"
    | "notes" | "terms" | "attachments" | "sentAt" | "paidAt" | "reverses" | "code"
  > = [
    "type", "status", "issueDate", "dueDate", "periodStart", "periodEnd",
    "seller", "buyer", "links", "items", "invoiceDiscount", "totals",
    "notes", "terms", "attachments", "sentAt", "paidAt", "reverses", "code",
  ];

  for (const k of updatableKeys) if (up[k] !== undefined) (inv as any).set(k, up[k]);

  await inv.save();
  logger.withReq.info(req, t("messages.updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("messages.updated"), data: inv });
});

/* ============== STATUS TRANSITION ============== */
export const changeInvoiceStatus = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { status } = (req.body || {}) as { status: InvoiceStatus };

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Invoice } = await getTenantModels(req);
  const inv = await Invoice.findOne({ _id: id, tenant: req.tenant });
  if (!inv) {
    res.status(404).json({ success: false, message: t("messages.notFound") });
    return;
  }

  (inv as any).status = status as InvoiceStatus;

  // basit otomasyonlar
  if (status === "sent" && !(inv as any).sentAt) (inv as any).sentAt = new Date();
  if (status === "paid" && !(inv as any).paidAt) (inv as any).paidAt = new Date();

  await inv.save();
  logger.withReq.info(req, t("messages.statusChanged"), { ...getRequestContext(req), id, status });
  res.status(200).json({ success: true, message: t("messages.statusChanged"), data: inv });
});

/* ================== GET LIST ================== */
export const adminGetInvoices = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Invoice } = await getTenantModels(req);

  const {
    status, type, customer, apartment, contract, billingPlan,
    q, issueFrom, issueTo, dueFrom, dueTo, limit = "200",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (status) filter.status = status;
  if (type) filter.type = type;

  if (customer && isValidObjectId(customer)) filter["links.customer"] = customer;
  if (apartment && isValidObjectId(apartment)) filter["links.apartment"] = apartment;
  if (contract && isValidObjectId(contract)) filter["links.contract"] = contract;
  if (billingPlan && isValidObjectId(billingPlan)) filter["links.billingPlan"] = billingPlan;

  if (q && q.trim()) {
    filter.$or = [
      { code: { $regex: q.trim(), $options: "i" } },
      { "buyer.name": { $regex: q.trim(), $options: "i" } },
    ];
  }

  if (issueFrom || issueTo) {
    filter.issueDate = {};
    if (issueFrom) filter.issueDate.$gte = new Date(String(issueFrom));
    if (issueTo)   filter.issueDate.$lte = new Date(String(issueTo));
  }
  if (dueFrom || dueTo) {
    filter.dueDate = {};
    if (dueFrom) filter.dueDate.$gte = new Date(String(dueFrom));
    if (dueTo)   filter.dueDate.$lte = new Date(String(dueTo));
  }

  const numLimit = Math.min(Number(limit) || 200, 500);

  const list = await Invoice.find(filter)
    .select("-__v")
    .populate([
      { path: "links.customer",         select: "companyName contactName" },
      { path: "links.apartment",        select: "title slug" },
      { path: "links.contract",         select: "code status" },
      { path: "links.billingPlan",      select: "code status" },
      { path: "links.billingOccurrences", select: "seq dueAt status" },
    ])
    .limit(numLimit)
    .sort({ issueDate: -1, createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("messages.listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("messages.listFetched"), data: list });
});

/* ================== GET BY ID ================== */
export const adminGetInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Invoice } = await getTenantModels(req);
  const doc = await Invoice.findOne({ _id: id, tenant: req.tenant })
    .populate([
      { path: "links.customer", select: "companyName contactName email phone" },
      { path: "links.apartment", select: "title slug" },
      { path: "links.contract",  select: "code status" },
      { path: "links.billingPlan", select: "code status" },
      { path: "links.billingOccurrences", select: "seq dueAt status" },
    ])
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("messages.notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("messages.fetched"), data: doc });
});

/* ================== DELETE ================== */
export const deleteInvoice = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Invoice } = await getTenantModels(req);
  const inv = await Invoice.findOne({ _id: id, tenant: req.tenant });
  if (!inv) {
    res.status(404).json({ success: false, message: t("messages.notFound") });
    return;
  }

  await inv.deleteOne();
  logger.withReq.info(req, t("messages.deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("messages.deleted") });
});
