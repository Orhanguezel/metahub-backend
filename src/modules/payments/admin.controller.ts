// src/modules/payments/admin.controller.ts
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

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

const parseIfJson = (v: any) => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};
const toUpper = (s?: string) => (s ? String(s).trim().toUpperCase() : s);
const toNumber = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/* ============== CREATE ============== */
export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Payment, Invoice } = await getTenantModels(req);

  const payload = { ...(req.body || {}) };
  payload.tenant = req.tenant;

  // normalize basic fields
  if (payload.code) payload.code = toUpper(payload.code);
  if (payload.currency) payload.currency = toUpper(payload.currency);
  if (payload.receivedAt) payload.receivedAt = new Date(payload.receivedAt);

  // parse complex
  payload.fees = parseIfJson(payload.fees);
  payload.allocations = parseIfJson(payload.allocations);
  payload.links = parseIfJson(payload.links);
  payload.payer = parseIfJson(payload.payer);
  payload.instrument = parseIfJson(payload.instrument);

  // sanitize numbers
  payload.grossAmount = toNumber(payload.grossAmount, 0);
  if (Array.isArray(payload.fees)) {
    payload.fees = payload.fees.map((f: any) => ({
      ...f,
      amount: toNumber(f?.amount, 0),
      currency: f?.currency || payload.currency,
    }));
  }

  // allocations varsa, invoice snapshot (code) doldur
  if (Array.isArray(payload.allocations) && payload.allocations.length > 0) {
    for (const a of payload.allocations) {
      a.amount = toNumber(a?.amount, 0);
      if (a?.invoice && isValidObjectId(a.invoice)) {
        const inv = await Invoice.findOne({ _id: a.invoice, tenant: req.tenant })
          .select("code totals.currency")
          .lean();
        if (inv) a.invoiceCode = inv.code;
      }
    }
  }

  const doc = await Payment.create(payload);

  logger.withReq.info(req, t("created"), {
    ...getRequestContext(req),
    id: doc._id,
    code: doc.code,
    status: doc.status,
  });

  res.status(201).json({ success: true, message: t("created"), data: doc });
  return;
});

/* ============== UPDATE ============== */
export const updatePayment = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Payment, Invoice } = await getTenantModels(req);
  const pay = await Payment.findOne({ _id: id, tenant: req.tenant });
  if (!pay) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const up = { ...(req.body || {}) };

  // normalize
  if (up.code) up.code = toUpper(up.code);
  if (up.currency) up.currency = toUpper(up.currency);
  if (up.receivedAt) up.receivedAt = new Date(up.receivedAt);
  if (up.bookedAt) up.bookedAt = new Date(up.bookedAt);

  up.fees = parseIfJson(up.fees);
  up.allocations = parseIfJson(up.allocations);
  up.links = parseIfJson(up.links);
  up.payer = parseIfJson(up.payer);
  up.instrument = parseIfJson(up.instrument);

  if (up.grossAmount !== undefined) up.grossAmount = toNumber(up.grossAmount, pay.grossAmount);

  if (Array.isArray(up.fees)) {
    up.fees = up.fees.map((f: any) => ({
      ...f,
      amount: toNumber(f?.amount, 0),
      currency: f?.currency || up.currency || pay.currency,
    }));
  }

  // allocations güncellendiyse invoiceCode snapshotla
  if (Array.isArray(up.allocations)) {
    for (const a of up.allocations) {
      a.amount = toNumber(a?.amount, 0);
      if (a?.invoice && isValidObjectId(a.invoice)) {
        const inv = await Invoice.findOne({ _id: a.invoice, tenant: req.tenant })
          .select("code")
          .lean();
        if (inv) a.invoiceCode = inv.code;
      }
    }
  }

  const updatable = [
    "kind",
    "status",
    "method",
    "provider",
    "providerRef",
    "reference",
    "grossAmount",
    "currency",
    "fxRate",
    "fees",
    "receivedAt",
    "bookedAt",
    "payer",
    "instrument",
    "links",
    "allocations",
    "metadata",
    "reconciled",
    "reconciledAt",
    "statementRef",
    "code",
  ] as const;

  for (const k of updatable) if (up[k] !== undefined) (pay as any)[k] = up[k];

  await pay.save();

  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: pay });
  return;
});

/* ======== STATUS (PATCH /:id/status) ======== */
export const changePaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { status } = req.body as {
    status:
      | "pending"
      | "confirmed"
      | "partially_allocated"
      | "allocated"
      | "failed"
      | "canceled";
  };

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Payment } = await getTenantModels(req);
  const pay = await Payment.findOne({ _id: id, tenant: req.tenant });
  if (!pay) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  pay.status = status;
  await pay.save();

  logger.withReq.info(req, t("statusChanged"), { ...getRequestContext(req), id, status });
  res.status(200).json({ success: true, message: t("statusChanged"), data: pay });
  return;
});

/* ============== LIST ============== */
export const adminGetPayments = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Payment } = await getTenantModels(req);

  const {
    status,
    kind,
    method,
    customer,
    apartment,
    contract,
    invoice, // allocations.invoice
    reconciled,
    provider,
    q, // code or reference/providerRef/payer.name
    receivedFrom,
    receivedTo,
    amountMin,
    amountMax,
    limit = "200",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (status) filter.status = status;
  if (kind) filter.kind = kind;
  if (method) filter.method = method;
  if (provider) filter.provider = provider;
  if (typeof reconciled === "string") filter.reconciled = reconciled === "true";

  if (customer && isValidObjectId(customer)) filter["links.customer"] = customer;
  if (apartment && isValidObjectId(apartment)) filter["links.apartment"] = apartment;
  if (contract && isValidObjectId(contract)) filter["links.contract"] = contract;
  if (invoice && isValidObjectId(invoice)) filter["allocations.invoice"] = invoice;

  if (q && q.trim()) {
    filter.$or = [
      { code: { $regex: q.trim(), $options: "i" } },
      { reference: { $regex: q.trim(), $options: "i" } },
      { providerRef: { $regex: q.trim(), $options: "i" } },
      { "payer.name": { $regex: q.trim(), $options: "i" } },
    ];
  }

  if (receivedFrom || receivedTo) {
    filter.receivedAt = {};
    if (receivedFrom) filter.receivedAt.$gte = new Date(String(receivedFrom));
    if (receivedTo) filter.receivedAt.$lte = new Date(String(receivedTo));
  }

  if (amountMin || amountMax) {
    filter.grossAmount = {};
    if (amountMin) filter.grossAmount.$gte = Number(amountMin);
    if (amountMax) filter.grossAmount.$lte = Number(amountMax);
  }

  const list = await Payment.find(filter)
    .populate([
      { path: "links.customer", select: "companyName contactName" },
      { path: "links.apartment", select: "title slug" },
      { path: "links.contract", select: "code status" },
      { path: "allocations.invoice", select: "code status totals.currency" },
    ])
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ receivedAt: -1, createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("listFetched"), {
    ...getRequestContext(req),
    resultCount: list.length,
  });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
  return;
});

/* ============== GET BY ID ============== */
export const adminGetPaymentById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Payment } = await getTenantModels(req);
  const doc = await Payment.findOne({ _id: id, tenant: req.tenant })
    .populate([
      { path: "links.customer", select: "companyName contactName email phone" },
      { path: "links.apartment", select: "title slug" },
      { path: "links.contract", select: "code status" },
      { path: "allocations.invoice", select: "code status totals.currency" },
    ])
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
  return;
});

/* ============== DELETE ============== */
export const deletePayment = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Payment } = await getTenantModels(req);
  const pay = await Payment.findOne({ _id: id, tenant: req.tenant });
  if (!pay) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await pay.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
  return;
});
