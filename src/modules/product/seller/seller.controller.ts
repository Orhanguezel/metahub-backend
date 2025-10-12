// src/modules/product/seller/seller.controller.ts
import asyncHandler from "express-async-handler";
import type { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { createProduct, updateProduct, deleteProduct } from "../admin.controller";

/** Ortak guard: mySellerId yoksa 403 */
function ensureSellerContext(req: Request, res: Response): string | null {
  const mySellerId = (req as any).mySellerId as string | undefined;
  if (!mySellerId) {
    res.status(403).json({ success: false, message: "seller_context_required" });
    return null;
  }
  return mySellerId;
}

/** LIST (sadece kendi ürünleri) */
export const sellerListMyProducts = asyncHandler(async (req: Request, res: Response) => {
  const { Product } = await getTenantModels(req);
  const tenant = (req as any).tenant as string;
  const mySellerId = ensureSellerContext(req, res);
  if (!mySellerId) return;

  const {
    q, categoryId, brandId, status, visibility,
    minPrice, maxPrice, minStock, maxStock,
    sort = "created_desc",
    page = "1", pageSize = "50",
  } = req.query as Record<string, string>;

  const filter: any = { tenant, sellerId: mySellerId };

  if (q && q.trim()) filter.$text = { $search: q.trim() };
  if (categoryId && isValidObjectId(categoryId)) filter.categoryId = categoryId;
  if (brandId && isValidObjectId(brandId)) filter.brandId = brandId;
  if (status) filter.status = status;
  if (visibility) filter.visibility = visibility;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (minStock || maxStock) {
    filter.stock = {};
    if (minStock) filter.stock.$gte = Number(minStock);
    if (maxStock) filter.stock.$lte = Number(maxStock);
  }

  const sortMap: Record<string, any> = {
    created_desc: { createdAt: -1 },
    created_asc: { createdAt: 1 },
    price_asc: { price: 1, createdAt: -1 },
    price_desc: { price: -1, createdAt: -1 },
    stock_desc: { stock: -1, createdAt: -1 },
    stock_asc: { stock: 1, createdAt: -1 },
    rating_desc: { rating: -1, createdAt: -1 },
  };

  const pageNum = Math.max(1, Number(page) || 1);
  const sizeNum = Math.min(200, Math.max(1, Number(pageSize) || 50));

  const rows = await Product.find(filter)
  .sort(sortMap[sort] || sortMap.created_desc)
  .skip((pageNum - 1) * sizeNum)
  .limit(sizeNum)
  .populate({
    path: "seller",
    select: "companyName contactName slug avatarUrl rating isActive",
    strictPopulate: false,
  })
  .lean();

  const total = await Product.countDocuments(filter);

  res.status(200).json({
    success: true,
    message: "listFetched",
    data: rows,
    meta: { page: pageNum, pageSize: sizeNum, total, pages: Math.ceil(total / sizeNum) },
  });
});

/** DETAIL (sadece kendi ürünü) */
export const sellerGetMyProductById = asyncHandler(async (req: Request, res: Response) => {
  const { Product } = await getTenantModels(req);
  const tenant = (req as any).tenant as string;
  const mySellerId = ensureSellerContext(req, res);
  if (!mySellerId) return;

  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "invalid_product_id" });
    return;
  }

  const doc = await Product.findOne({ _id: id, tenant, sellerId: mySellerId })
  .populate({
    path: "seller",
    select: "companyName contactName slug avatarUrl rating isActive",
    strictPopulate: false,
  })
  .lean();
  if (!doc) {
    res.status(404).json({ success: false, message: "notFound" });
    return;
  }

  res.status(200).json({ success: true, message: "fetched", data: doc });
});

/** CREATE (sellerId enforce) */
export const sellerCreateMyProduct = asyncHandler(async (req, res, next) => {
  const mySellerId = ensureSellerContext(req, res);
  if (!mySellerId) return;

  // FE / normalizer hangi adı beklerse beklesin hepsini besleyelim:
  (req.body as any).sellerId = mySellerId;
  (req.body as any).seller   = mySellerId;  // <-- alias
  (req as any).mySellerId    = mySellerId;  // <-- controller içi enforcement için işaret

  return (createProduct as any)(req, res, next);
});


/** UPDATE (sahiplik doğrula → sellerId enforce) */
export const sellerUpdateMyProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { Product } = await getTenantModels(req);
  const tenant = (req as any).tenant as string;
  const mySellerId = ensureSellerContext(req, res);
  if (!mySellerId) return;

  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "invalid_product_id" });
    return;
  }

  const exists = await Product.exists({ _id: id, tenant, sellerId: mySellerId });
  if (!exists) {
    res.status(404).json({ success: false, message: "notFound" });
    return;
  }

  (req.body as any).sellerId = mySellerId; // başka satıcıya taşımayı önle
  (req as any).mySellerId = mySellerId;

  return (updateProduct as any)(req, res, next);
});

/** DELETE (sadece kendi ürünü) */
export const sellerDeleteMyProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { Product } = await getTenantModels(req);
  const tenant = (req as any).tenant as string;
  const mySellerId = ensureSellerContext(req, res);
  if (!mySellerId) return;

  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "invalid_product_id" });
    return;
  }

  const exists = await Product.exists({ _id: id, tenant, sellerId: mySellerId });
  if (!exists) {
    res.status(404).json({ success: false, message: "notFound" });
    return;
  }

  return (deleteProduct as any)(req, res, next);
});
