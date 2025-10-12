import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { issueGiftcard, topupGiftcard } from "./service";

/** GET /giftcards/admin */
export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const { Giftcard } = await getTenantModels(req);
  const { q, status, from, to, page = "1", limit = "20" } = req.query as Record<string,string>;

  const filter: any = { tenant: req.tenant };
  if (q) filter.code = { $regex: String(q).trim(), $options: "i" };
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const pg = Math.max(1, parseInt(page || "1", 10));
  const lm = Math.min(200, Math.max(1, parseInt(limit || "20", 10)));
  const skip = (pg - 1) * lm;

  const [items, total] = await Promise.all([
    Giftcard.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lm).lean(),
    Giftcard.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data: items, meta: { page: pg, limit: lm, total } });
});

/** GET /giftcards/admin/:id */
export const adminGetById = asyncHandler(async (req: Request, res: Response) => {
  const { Giftcard } = await getTenantModels(req);
  const { id } = req.params;

  const doc = await Giftcard.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  res.status(200).json({ success: true, data: doc });
});

/** POST /giftcards/admin/issue */
export const adminIssue = asyncHandler(async (req: Request, res: Response) => {
  const { Giftcard } = await getTenantModels(req);
  const { code, initialBalance_cents, currency, expiresAt } = req.body as any;

  const doc = await issueGiftcard({
    Giftcard,
    tenant: req.tenant!,
    code,
    initialBalance_cents: Number(initialBalance_cents),
    currency,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
  });

  res.status(201).json({ success: true, message: "issued", data: doc });
});

/** POST /giftcards/admin/:id/topup */
export const adminTopup = asyncHandler(async (req: Request, res: Response) => {
  const { Giftcard } = await getTenantModels(req);
  const { id } = req.params;
  const { amount_cents, note } = req.body as any;

  const out = await topupGiftcard({
    Giftcard,
    tenant: req.tenant!,
    id,
    amount_cents: Number(amount_cents),
    note,
  });

  if (!out.ok) { res.status(404).json({ success: false, message: out.error }); return; }
  res.status(200).json({ success: true, message: "topped_up", data: out.card });
});

/** PATCH /giftcards/admin/:id/meta  (expiresAt/currency güncelle) */
export const adminUpdateMeta = asyncHandler(async (req: Request, res: Response) => {
  const { Giftcard } = await getTenantModels(req);
  const { id } = req.params;
  const { expiresAt, currency } = req.body as any;

  const doc = await Giftcard.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  if (expiresAt) (doc as any).expiresAt = new Date(expiresAt);
  if (currency) (doc as any).currency = String(currency).toUpperCase();

  await (doc as any).save();
  res.status(200).json({ success: true, message: "updated", data: doc });
});

/** PATCH /giftcards/admin/:id/status { status: active|disabled } */
export const adminDisableEnable = asyncHandler(async (req: Request, res: Response) => {
  const { Giftcard } = await getTenantModels(req);
  const { id } = req.params;
  const { status } = req.body as { status: "active" | "disabled" };

  const doc = await Giftcard.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  (doc as any).status = status;
  await (doc as any).save();
  res.status(200).json({ success: true, message: "status_changed", data: doc });
});

/** DELETE /giftcards/admin/:id (idempotent) */
export const adminDelete = asyncHandler(async (req: Request, res: Response) => {
  const { Giftcard } = await getTenantModels(req);
  const { id } = req.params;

  const doc = await Giftcard.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  await (doc as any).deleteOne();
  res.status(200).json({ success: true, message: "deleted" });
});
