import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

/** GET /media/public */
export const publicList = asyncHandler(async (req: Request, res: Response) => {
  const { MediaAsset } = await getTenantModels(req);
  const { tag, page = "1", limit = "20" } = req.query as Record<string,string>;

  const filter: any = { tenant: req.tenant };
  if (tag) filter.tags = tag;

  const p = Math.max(1, parseInt(page || "1", 10));
  const l = Math.min(200, Math.max(1, parseInt(limit || "20", 10)));
  const skip = (p - 1) * l;

  const [items, total] = await Promise.all([
    MediaAsset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
    MediaAsset.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data: items, meta: { page: p, limit: l, total } });
});

/** GET /media/public/:id */
export const publicGetById = asyncHandler(async (req: Request, res: Response) => {
  const { MediaAsset } = await getTenantModels(req);
  const doc = await MediaAsset.findOne({ _id: req.params.id, tenant: req.tenant }).lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  res.status(200).json({ success: true, data: doc });
});
