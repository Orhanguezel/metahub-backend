import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { computeBalance } from "./service";

/** GET /loyalty/public/balance */
export const getMyBalance = asyncHandler(async (req: Request, res: Response) => {
  const { LoyaltyLedger } = await getTenantModels(req);
  const userId = (req as any).user?._id;
  if (!userId) { res.status(401).json({ success: false, message: "unauthorized" }); return; }

  const at = req.query.at ? new Date(String(req.query.at)) : new Date();
  const summary = await computeBalance({ LoyaltyLedger, tenant: req.tenant!, userId, at });
  res.status(200).json({ success: true, data: summary });
});

/** GET /loyalty/public/ledger */
export const getMyLedger = asyncHandler(async (req: Request, res: Response) => {
  const { LoyaltyLedger } = await getTenantModels(req);
  const userId = (req as any).user?._id;
  if (!userId) { res.status(401).json({ success: false, message: "unauthorized" }); return; }

  const { from, to, page = "1", limit = "20" } = req.query as Record<string, string>;
  const filter: any = { tenant: req.tenant, user: userId };
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
      .populate("order", "orderNo status").lean(),
    LoyaltyLedger.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data: items, meta: { page: pg, limit: lm, total } });
});
