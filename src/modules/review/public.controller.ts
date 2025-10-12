// src/modules/reviews/public.controller.ts
import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { Types, isValidObjectId } from "mongoose";
import type { ReviewCreateInput } from "./types";

/** GET /reviews/public?product=...&page=&limit=&sort= */
export const listApprovedForPublic = asyncHandler(async (req: Request, res: Response) => {
  const { Review } = await getTenantModels(req);
  const { product, page = "1", limit = "20", sort = "newest" } = req.query as any;

  const filter: any = { tenant: req.tenant, status: "approved" };
  if (product) filter.product = product;

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
    Review.find(filter)
      .sort(sortMap[sort] || sortMap.newest)
      .skip(skip)
      .limit(lm)
      .populate("user", "name")
      .lean(),
    Review.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data: items, meta: { page: pg, limit: lm, total } });
});

/** GET /reviews/public/stats?product=... */
export const getStatsForProduct = asyncHandler(async (req: Request, res: Response) => {
  const { Review } = await getTenantModels(req);
  const { product } = req.query as { product?: string };

  if (!product) { res.status(400).json({ success: false, message: "product_required" }); return; }
  if (!isValidObjectId(product)) { res.status(400).json({ success: false, message: "invalid_product_id" }); return; }

  const productId = new Types.ObjectId(product);

  const [row] = await Review.aggregate([
    { $match: { tenant: req.tenant, product: productId, status: "approved" } },
    {
      $group: {
        _id: "$product",
        count: { $sum: 1 },
        avg: { $avg: "$rating" },
        b1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        b2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        b3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        b4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        b5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
      },
    },
  ]);

  const data = row
    ? { count: row.count, avg: Math.round(row.avg * 10) / 10, buckets: { 1: row.b1, 2: row.b2, 3: row.b3, 4: row.b4, 5: row.b5 } }
    : { count: 0, avg: 0, buckets: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

  res.status(200).json({ success: true, data });
});

/** POST /reviews/public  → misafir/üye herkes yorum+puan bırakabilir */
export const createPublicReview = asyncHandler(async (req: Request, res: Response) => {
  const { Review } = await getTenantModels(req);
  const body = req.body as ReviewCreateInput;

  const userId = (req as any).user?._id; // varsa ekle; yoksa misafir

  const payload: any = {
    tenant: req.tenant,
    product: body.product,
    rating: Number(body.rating),
    title: body.title,
    content: body.content,
    images: Array.isArray(body.images) ? body.images : [],
    status: "approved",
  };
  if (userId) payload.user = userId; // Sadece mevcutsa set et (null/undefined asla yazma)

  try {
    const doc = await Review.create(payload);
    res.status(201).json({ success: true, message: "review_created", data: doc });
  } catch (err: any) {
    // Aynı kullanıcı aynı ürüne tekrar yorum atmaya çalışırsa:
    if (err?.code === 11000) {
      res.status(409).json({ success: false, message: "duplicate_review" });
      return;
    }
    throw err;
  }
});

/** POST /reviews/public/:id/like  &  /dislike */
export const addReaction = (kind: "like" | "dislike") =>
  asyncHandler(async (req: Request, res: Response) => {
    const { Review } = await getTenantModels(req);
    const { id } = req.params;

    const inc: any = kind === "like" ? { likes: 1 } : { dislikes: 1 };
    const doc = await Review.findOneAndUpdate(
      { _id: id, tenant: req.tenant, status: "approved" },
      { $inc: inc },
      { new: true }
    ).lean();

    if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
    res.status(200).json({ success: true, message: `${kind}_added`, data: doc });
  });
