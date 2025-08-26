// modules/invoicing/admin.controller.ts
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

  if (status === "sent" && !(inv as any).sentAt) (inv as any).sentAt = new Date();
  if (status === "paid" && !(inv as any).paidAt) (inv as any).paidAt = new Date();

  await inv.save();
  logger.withReq.info(req, t("messages.statusChanged"), { ...getRequestContext(req), id, status });
  res.status(200).json({ success: true, message: t("messages.statusChanged"), data: inv });
});

/* ================== GET LIST (+meta) ================== */
export const adminGetInvoices = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Invoice } = await getTenantModels(req);

  const {
    status, type, customer, apartment, contract, billingPlan,
    q, issueFrom, issueTo, dueFrom, dueTo,
    page = "1", limit = "20", sort = "issueDate:desc",
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

  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(Math.max(1, Number(limit) || 20), 100);
  const [sortField, sortDirRaw] = String(sort).split(":");
  const sortObj: any = { [sortField || "issueDate"]: (sortDirRaw || "desc").toLowerCase() === "asc" ? 1 : -1 };

  const total = await Invoice.countDocuments(filter);
  const list = await Invoice.find(filter)
    .select("-__v")
    .populate([
      { path: "links.customer",         select: "companyName contactName" },
      { path: "links.apartment",        select: "title slug" },
      { path: "links.contract",         select: "code status" },
      { path: "links.billingPlan",      select: "code status" },
      { path: "links.billingOccurrences", select: "seq dueAt status" },
    ])
    .sort(sortObj)
    .skip((p - 1) * l)
    .limit(l)
    .lean();

  logger.withReq.info(req, t("messages.listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({
    success: true,
    message: t("messages.listFetched"),
    data: list,
    meta: { page: p, limit: l, total },
  });
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

/* ================== CREATE FROM ORDER (MVP fiş) ================== */
export const createInvoiceFromOrder = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { orderId } = (req.body || {}) as { orderId: string };
  if (!isValidObjectId(orderId)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Order, Invoice, User } = await getTenantModels(req);
  const order = await Order.findOne({ _id: orderId, tenant: req.tenant }).lean<any>();
  if (!order) {
    res.status(404).json({ success: false, message: t("messages.notFound") });
    return;
  }

  // Buyer snapshot
  const buyerName =
    order?.shippingAddress?.name ||
    order?.userName ||
    "Customer";
  const buyer: any = {
    name: buyerName,
    email: order?.userEmail,
    phone: order?.shippingAddress?.phone,
    addressLine: [order?.shippingAddress?.street, order?.shippingAddress?.city, order?.shippingAddress?.postalCode]
      .filter(Boolean)
      .join(", "),
  };

  // Seller snapshot (tenant adını koyuyoruz; gerekirse ayarlardan zenginleştir)
  const seller: any = {
    name: req.tenantData?.name?.[req.locale as any] || req.tenantData?.name?.en || req.tenant || "Seller",
    email: req.tenantData?.emailSettings?.senderEmail,
  };

  // Items → invoice items
  const items = [];
  let itemsSubtotal = 0;

  for (const it of order.items || []) {
    const qty = Math.max(1, Number(it.quantity || 1));
    const unitPrice = Number(it.unitPrice || 0);
    itemsSubtotal += qty * unitPrice;

    const nameLabel = (it.menu?.snapshot?.name as any) || {};
    const name: Record<string, string> =
      typeof nameLabel === "object" && Object.keys(nameLabel).length
        ? nameLabel
        : { tr: "Ürün", en: "Product" };

    items.push({
      kind: "product",
      ref: it.product,
      name,
      quantity: qty,
      unitPrice,
      taxRate: 0,
    });
  }

  // Fees as separate items (delivery/service/tip) if any
  const addFee = (labelTr: string, labelEn: string, amount: number) => {
    if (amount && amount > 0) {
      items.push({
        kind: "fee",
        name: { tr: labelTr, en: labelEn },
        quantity: 1,
        unitPrice: amount,
        taxRate: 0,
      });
      itemsSubtotal += amount;
    }
  };
  addFee("Teslimat Ücreti", "Delivery Fee", Number(order.deliveryFee || 0));
  addFee("Servis Ücreti", "Service Fee", Number(order.serviceFee || 0));
  addFee("Bahşiş", "Tip", Number(order.tipAmount || 0));

  const currency = order.currency || "TRY";
  const taxTotal = Number(order.taxTotal || 0);
  const invoiceDiscountTotal = Number(order.discount || 0);
  const rounding = 0;
  const grandTotal = Math.max(0, itemsSubtotal + taxTotal - invoiceDiscountTotal + rounding);

  const payload = {
    tenant: req.tenant,
    type: "invoice",
    status: "issued" as InvoiceStatus,
    issueDate: new Date(),
    dueDate: undefined,
    seller,
    buyer,
    links: { order: order._id },
    items,
    invoiceDiscount: invoiceDiscountTotal ? { type: "amount", value: invoiceDiscountTotal } : undefined,
    totals: {
      currency,
      itemsSubtotal,
      itemsDiscountTotal: 0,
      invoiceDiscountTotal,
      taxTotal,
      rounding,
      grandTotal,
      amountPaid: 0,
      balance: grandTotal,
    },
  };

  const doc = await Invoice.create(payload as any);
  res.status(201).json({ success: true, message: t("messages.created"), data: doc });
});
