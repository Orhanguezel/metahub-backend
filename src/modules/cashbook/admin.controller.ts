import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

/* ================= ACCOUNTS ================= */

// POST /cashbook/accounts
export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashAccount } = await getTenantModels(req);

  const b = req.body;
  const doc = await CashAccount.create({
    tenant: req.tenant,
    code: toUpperSnake(b.code),
    name: b.name,
    type: b.type,
    currency: b.currency,
    openingBalance: Number(b.openingBalance || 0),
    currentBalance: Number(b.openingBalance || 0),
    isActive: b.isActive === "false" ? false : true,
  });

  logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
  res.status(201).json({ success: true, message: t("created"), data: doc });
  return;
});

// PUT /cashbook/accounts/:id
export const updateAccount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashAccount, CashEntry } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const acc = await CashAccount.findOne({ _id: id, tenant: req.tenant });
  if (!acc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const b = req.body || {};
  if (b.code) acc.code = toUpperSnake(b.code);
  if (b.name !== undefined) acc.name = b.name;
  if (b.type !== undefined) acc.type = b.type;
  if (b.isActive !== undefined) acc.isActive = b.isActive === "true" || b.isActive === true;

  // currency değişimi varsa, entry var mı kontrol et
  if (b.currency && b.currency !== acc.currency) {
    const hasEntries = await CashEntry.exists({ tenant: req.tenant, accountId: acc._id });
    if (hasEntries) {
      res.status(409).json({ success: false, message: t("error.currency_change_not_allowed") });
      return;
    }
    acc.currency = b.currency;
  }

  await acc.save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: acc });
  return;
});

// GET /cashbook/accounts
export const adminGetAccounts = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashAccount } = await getTenantModels(req);

  const { isActive } = req.query;
  const filter: any = { tenant: req.tenant };
  if (typeof isActive === "string") filter.isActive = isActive === "true";

  const list = await CashAccount.find(filter).sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
  return;
});

// GET /cashbook/accounts/:id
export const adminGetAccountById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashAccount } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const acc = await CashAccount.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!acc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: acc });
  return;
});

// DELETE /cashbook/accounts/:id  (entries varsa engelle)
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashAccount, CashEntry } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const acc = await CashAccount.findOne({ _id: id, tenant: req.tenant });
  if (!acc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const hasEntries = await CashEntry.exists({ tenant: req.tenant, accountId: acc._id });
  if (hasEntries) {
    res.status(409).json({ success: false, message: t("error.account_has_entries") });
    return;
  }

  await acc.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
  return;
});

/* ================= ENTRIES ================= */

// helper: bakiyeyi güncelle
async function applyBalanceDelta(req: Request, accountId: any, delta: number) {
  const { CashAccount } = await getTenantModels(req);
  await CashAccount.updateOne(
    { _id: accountId, tenant: req.tenant },
    { $inc: { currentBalance: delta } }
  ).exec();
}

// POST /cashbook/entries  (manual entry)
export const createEntry = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashAccount, CashEntry } = await getTenantModels(req);

  const b = req.body;
  if (!isValidObjectId(b.accountId)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const acc = await CashAccount.findOne({ _id: b.accountId, tenant: req.tenant });
  if (!acc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }
  if (b.currency && b.currency !== acc.currency) {
    res.status(400).json({ success: false, message: t("error.currency_mismatch") });
    return;
  }

  const direction = b.direction === "out" ? "out" : "in";
  const amount = Number(b.amount);
  const delta = direction === "in" ? amount : -amount;

  const entry = await CashEntry.create({
    tenant: req.tenant,
    accountId: acc._id,
    date: b.date ? new Date(b.date) : new Date(),
    direction,
    amount,
    currency: acc.currency,
    description: b.description,
    category: b.category,
    tags: Array.isArray(b.tags) ? b.tags : [],
    apartmentId: b.apartmentId,
    contractId: b.contractId,
    invoiceId: b.invoiceId,
    paymentId: b.paymentId,
    expenseId: b.expenseId,
    jobId: b.jobId,
    source: { module: "manual" },
    locked: false,
    isReconciled: false,
    isActive: true,
  });

  await applyBalanceDelta(req, acc._id, delta);

  logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: entry._id });
  res.status(201).json({ success: true, message: t("created"), data: entry });
  return;
});

// PUT /cashbook/entries/:id  (yalnız manual & unlocked)
export const updateEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashEntry } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const e = await CashEntry.findOne({ _id: id, tenant: req.tenant });
  if (!e) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }
  if (e.locked) {
    res.status(409).json({ success: false, message: t("error.entry_locked") });
    return;
  }

  const prevDelta = e.direction === "in" ? e.amount : -e.amount;

  const b = req.body || {};
  if (b.date) e.date = new Date(b.date);
  if (b.description !== undefined) e.description = b.description;
  if (b.category !== undefined) e.category = b.category;
  if (b.tags !== undefined) e.tags = Array.isArray(b.tags) ? b.tags : [];

  if (b.direction || b.amount !== undefined) {
    e.direction = b.direction ? (b.direction === "out" ? "out" : "in") : e.direction;
    e.amount = b.amount !== undefined ? Number(b.amount) : e.amount;
  }

  const newDelta = e.direction === "in" ? e.amount : -e.amount;

  await e.save();

  // balance düzeltmesi
  const diff = newDelta - prevDelta;
  if (diff !== 0) await applyBalanceDelta(req, e.accountId, diff);

  res.status(200).json({ success: true, message: t("updated"), data: e });
  return;
});

// GET /cashbook/entries
export const adminGetEntries = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashEntry } = await getTenantModels(req);

  const { accountId, from, to, direction, category, reconciled, apartmentId } =
    req.query as Record<string, string>;
  const filter: any = { tenant: req.tenant, isActive: true };

  if (accountId && isValidObjectId(accountId)) filter.accountId = accountId;
  if (apartmentId && isValidObjectId(apartmentId)) filter.apartmentId = apartmentId;
  if (direction && (direction === "in" || direction === "out")) filter.direction = direction;
  if (category) filter.category = category;
  if (typeof reconciled === "string") filter.isReconciled = reconciled === "true";
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const list = await CashEntry.find(filter).sort({ date: -1, createdAt: -1 }).lean();
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
  return;
});

// GET /cashbook/entries/:id
export const adminGetEntryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashEntry } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const e = await CashEntry.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!e) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: e });
  return;
});

// DELETE /cashbook/entries/:id  (yalnız manual & unlocked)
export const deleteEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashEntry } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const e = await CashEntry.findOne({ _id: id, tenant: req.tenant });
  if (!e) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }
  if (e.locked) {
    res.status(409).json({ success: false, message: t("error.entry_locked") });
    return;
  }

  const delta = e.direction === "in" ? -e.amount : e.amount; // silerken tersine uygula
  await e.deleteOne();
  await applyBalanceDelta(req, e.accountId, delta);

  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
  return;
});

/* ============== RECONCILIATION (basit) ============== */

// POST /cashbook/reconcile
export const reconcileEntries = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashEntry } = await getTenantModels(req);

  const { entryIds, reconciliationId } = req.body as {
    entryIds: string[];
    reconciliationId?: string;
  };
  if (!Array.isArray(entryIds) || entryIds.some((id) => !isValidObjectId(id))) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const rid = reconciliationId || `REC-${Date.now()}`;
  await CashEntry.updateMany(
    { tenant: req.tenant, _id: { $in: entryIds } },
    { $set: { isReconciled: true, reconciliationId: rid, reconciledAt: new Date() } }
  );

  res.status(200).json({ success: true, message: t("reconciled"), data: { reconciliationId: rid } });
  return;
});

// DELETE /cashbook/reconcile/:rid
export const unreconcileById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { CashEntry } = await getTenantModels(req);

  const { rid } = req.params;
  await CashEntry.updateMany(
    { tenant: req.tenant, reconciliationId: rid },
    { $set: { isReconciled: false }, $unset: { reconciliationId: 1, reconciledAt: 1 } }
  );

  res.status(200).json({ success: true, message: t("unreconciled") });
  return;
});
