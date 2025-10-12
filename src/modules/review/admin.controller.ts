import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { ReviewUpdateInput } from "./types";
import { isValidObjectId } from "@/core/middleware/auth/validation";

/** GET /reviews/admin */
export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const { Review } = await getTenantModels(req);
  const {
    product, user, status, q, minRating, maxRating,
    page = "1", limit = "20", sort = "newest",
  } = req.query as any;

  const filter: any = { tenant: req.tenant };
  if (product) filter.product = product;
  if (user) filter.user = user;
  if (status) filter.status = status;
  if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { content: { $regex: q, $options: "i" } }];
  if (minRating) filter.rating = { ...(filter.rating || {}), $gte: Number(minRating) };
  if (maxRating) filter.rating = { ...(filter.rating || {}), $lte: Number(maxRating) };

  const pg = Math.max(1, parseInt(String(page), 10) || 1);
  const lm = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 20));
  const skip = (pg - 1) * lm;

  const sortMap: Record<string, any> = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    rating_desc: { rating: -1, createdAt: -1 },
    rating_asc: { rating: 1, createdAt: -1 },
    helpful: { likes: -1, createdAt: -1 },
  };

  const [items, total] = await Promise.all([
    Review.find(filter).sort(sortMap[sort] || sortMap.newest).skip(skip).limit(lm)
      .populate("user", "name email").populate("product", "title sku").lean(),
    Review.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data: items, meta: { page: pg, limit: lm, total } });
});

/** GET /reviews/admin/:id */
export const adminGetById = asyncHandler(async (req: Request, res: Response) => {
  const { Review } = await getTenantModels(req);
  const { id } = req.params;
  const doc = await Review.findOne({ _id: id, tenant: req.tenant })
    .populate("user", "name email")
    .populate("product", "title sku")
    .lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  res.status(200).json({ success: true, data: doc });
});

/** PUT /reviews/admin/:id */
export const adminUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { Review } = await getTenantModels(req);
  const { id } = req.params;
  const up = req.body as ReviewUpdateInput;

  const doc = await Review.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  if (typeof up.rating === "number") (doc as any).rating = up.rating;
  if (up.title !== undefined) (doc as any).title = up.title;
  if (up.content !== undefined) (doc as any).content = up.content;
  if (Array.isArray(up.images)) (doc as any).images = up.images;
  if (up.status) (doc as any).status = up.status;

  await (doc as any).save();
  res.status(200).json({ success: true, message: "updated", data: doc });
});

/** PATCH /reviews/admin/:id/status { status } */
export const adminChangeStatus = asyncHandler(async (req: Request, res: Response) => {
  const { Review } = await getTenantModels(req);
  const { id } = req.params;
  const { status } = req.body as { status: "pending" | "approved" | "rejected" };

  const doc = await Review.findOneAndUpdate(
    { _id: id, tenant: req.tenant },
    { $set: { status } },
    { new: true }
  ).lean();

  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  res.status(200).json({ success: true, message: "status_changed", data: doc });
});

/** DELETE /reviews/admin/:id */
export const adminDelete = asyncHandler(async (req: Request, res: Response) => {
  const { Review } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: "invalid_id" }); return; }

  const doc = await Review.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  await (doc as any).deleteOne();
  res.status(200).json({ success: true, message: "deleted" });
});
