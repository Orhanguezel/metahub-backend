import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { isValidObjectId } from "@/core/utils/validation";
import { SupportedLocale } from "@/types/common";
import type { InvoiceStatus } from "./types";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* ================== CREATE ================== */
export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { Invoice } = await getTenantModels(req);
  const t = tByReq(req);

  const payload = req.body ?? {};
  const doc = await Invoice.create({
    ...payload,
    tenant: req.tenant,
  });

  logger.withReq.info(req, t("created"), {
    ...getRequestContext(req),
    id: doc._id,
    code: (doc as any).code, // v2: code mevcut
  });

  res.status(201).json({ success: true, message: t("created"), data: doc });
  return;
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
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  // Draft dışındaki faturaları kilitlemek istersen buraya guard ekleyebilirsin:
  // if ((inv as any).status !== "draft") { ... }

  const up = req.body || {};
  const updatableKeys: Array<
    | "type" | "status" | "issueDate" | "dueDate" | "periodStart" | "periodEnd"
    | "seller" | "buyer" | "links" | "items" | "invoiceDiscount" | "totals"
    | "notes" | "terms" | "attachments" | "sentAt" | "paidAt" | "reverses" | "code"
  > = [
    "type","status","issueDate","dueDate","periodStart","periodEnd","seller","buyer",
    "links","items","invoiceDiscount","totals","notes","terms","attachments",
    "sentAt","paidAt","reverses","code",
  ];

  for (const k of updatableKeys) {
    if (up[k] !== undefined) (inv as any).set(k, up[k]);
  }

  await inv.save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: inv });
  return;
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
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  (inv as any).status = status as InvoiceStatus;

  // basit yan alanlar: sentAt/paidAt otomasyonu (opsiyonel)
  if (status === "sent" && !(inv as any).sentAt) (inv as any).sentAt = new Date();
  if (status === "paid") (inv as any).paidAt = (inv as any).paidAt ?? new Date();

  await inv.save();
  logger.withReq.info(req, t("statusChanged"), { ...getRequestContext(req), id, status });
  res.status(200).json({ success: true, message: t("statusChanged"), data: inv });
  return;
});

/* ================== GET LIST ================== */
export const adminGetInvoices = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Invoice } = await getTenantModels(req);

  const {
    status,
    type,
    customer,
    apartment,
    contract,
    billingPlan,
    q, // code veya buyer.name
    issueFrom,
    issueTo,
    dueFrom,
    dueTo,
    limit = "200",
  } = req.query;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof status === "string") filter.status = status;
  if (typeof type === "string") filter.type = type;

  if (typeof customer === "string" && isValidObjectId(customer)) filter["links.customer"] = customer;
  if (typeof apartment === "string" && isValidObjectId(apartment)) filter["links.apartment"] = apartment;
  if (typeof contract === "string" && isValidObjectId(contract)) filter["links.contract"] = contract;
  if (typeof billingPlan === "string" && isValidObjectId(billingPlan)) filter["links.billingPlan"] = billingPlan;

  if (typeof q === "string" && q.trim()) {
    filter.$or = [
      { code: { $regex: q.trim(), $options: "i" } },
      { "buyer.name": { $regex: q.trim(), $options: "i" } },
    ];
  }

  if (typeof issueFrom === "string" || typeof issueTo === "string") {
    filter.issueDate = {};
    if (issueFrom) filter.issueDate.$gte = new Date(String(issueFrom));
    if (issueTo)   filter.issueDate.$lte = new Date(String(issueTo));
  }
  if (typeof dueFrom === "string" || typeof dueTo === "string") {
    filter.dueDate = {};
    if (dueFrom) filter.dueDate.$gte = new Date(String(dueFrom));
    if (dueTo)   filter.dueDate.$lte = new Date(String(dueTo));
  }

  const numLimit = Math.min(Number(limit) || 200, 500);

  const list = await Invoice.find(filter)
    .select("-__v")
    .populate([
      { path: "links.customer", select: "companyName contactName" },
      { path: "links.apartment", select: "title slug" },
      { path: "links.contract", select: "code status" },
      { path: "links.billingPlan", select: "code status" },
      { path: "links.billingOccurrences", select: "seq dueAt status" },
    ])
    .limit(numLimit)
    .sort({ issueDate: -1, createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
  return;
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
      { path: "links.contract", select: "code status" },
      { path: "links.billingPlan", select: "code status" },
      { path: "links.billingOccurrences", select: "seq dueAt status" },
    ])
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
  return;
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
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await inv.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
  return;
});
