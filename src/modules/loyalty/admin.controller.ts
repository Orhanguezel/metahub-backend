import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { addLedgerEntry, computeBalance, spendPoints } from "./service";

/** GET /loyalty/admin */
export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const { LoyaltyLedger } = await getTenantModels(req);
  const { user, reason, from, to, page = "1", limit = "20" } = req.query as Record<string,string>;

  const filter: any = { tenant: req.tenant };
  if (user) filter.user = user;
  if (reason) filter.reason = reason;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const pg = Math.max(1, parseInt(page || "1", 10));
  const lm = Math.min(200, Math.max(1, parseInt(limit || "20", 10)));
  const skip = (pg - 1) * lm;

  const [items, total] = await Promise.all([
    LoyaltyLedger.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lm)
      .populate("user", "name email").populate("order", "orderNo status").lean(),
    LoyaltyLedger.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data: items, meta: { page: pg, limit: lm, total } });
});

/** GET /loyalty/admin/:id */
export const adminGetById = asyncHandler(async (req: Request, res: Response) => {
  const { LoyaltyLedger } = await getTenantModels(req);
  const { id } = req.params;

  const doc = await LoyaltyLedger.findOne({ _id: id, tenant: req.tenant })
    .populate("user", "name email").populate("order", "orderNo status").lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  res.status(200).json({ success: true, data: doc });
});

/** POST /loyalty/admin/adjust  (+/- puan girişleri) */
export const adminAdjust = asyncHandler(async (req: Request, res: Response) => {
  const { LoyaltyLedger } = await getTenantModels(req);
  const { user, points, reason, order, expiresAt } = req.body as any;

  const doc = await addLedgerEntry({
    LoyaltyLedger,
    tenant: req.tenant!,
    user,
    points: Number(points),
    reason,
    order,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
  });

  res.status(201).json({ success: true, message: "adjusted", data: doc });
});

/** POST /loyalty/admin/users/:userId/spend { amount, reason?, order? } */
export const adminSpend = asyncHandler(async (req: Request, res: Response) => {
  const { LoyaltyLedger } = await getTenantModels(req);
  const { userId } = req.params;
  const { amount, reason, order } = req.body as any;

  const out = await spendPoints({
    LoyaltyLedger,
    tenant: req.tenant!,
    user: userId,
    amount: Number(amount),
    reason,
    order,
  });

  if (!out.ok) {
    res.status(409).json({ success: false, message: out.error, data: { balance: out.balance } });
    return;
  }

  res.status(200).json({ success: true, message: "spent", data: out });
});

/** GET /loyalty/admin/users/:userId/balance */
export const adminUserBalance = asyncHandler(async (req: Request, res: Response) => {
  const { LoyaltyLedger } = await getTenantModels(req);
  const { userId } = req.params;
  const at = req.query.at ? new Date(String(req.query.at)) : new Date();

  const summary = await computeBalance({ LoyaltyLedger, tenant: req.tenant!, userId, at });
  res.status(200).json({ success: true, data: summary });
});

/** DELETE /loyalty/admin/:id (idempotent) */
export const adminDelete = asyncHandler(async (req: Request, res: Response) => {
  const { LoyaltyLedger } = await getTenantModels(req);
  const { id } = req.params;

  const doc = await LoyaltyLedger.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  await (doc as any).deleteOne();
  res.status(200).json({ success: true, message: "deleted" });
});
