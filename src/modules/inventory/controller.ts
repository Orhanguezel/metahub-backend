import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { recomputeInventoryAll, recomputeInventoryForProduct } from "./service";

/** Inventory modelini güvenli şekilde al */
function pickInventory(tenantModels: any) {
  return tenantModels.Inventory || tenantModels.InventoryModel;
}

/* GET /inventory */
export const listInventory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const tenantModels = await getTenantModels(req);
  const Inventory = pickInventory(tenantModels);
  if (!Inventory) {
    res.status(500).json({ success: false, message: "Inventory model is not registered" });
    return;
  }

  const { low, page = "1", limit = "20" } = req.query as Record<string, string>;
  const filter: any = { tenant: req.tenant };
  if (typeof low === "string" && low.toLowerCase() === "true") filter.isLow = true;

  const p = Math.max(1, parseInt(page as string, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
  const skip = (p - 1) * l;

  const [items, total] = await Promise.all([
    Inventory.find(filter)
      .populate("product", "title slug images")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(l)
      .lean(),
    Inventory.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: items,
    meta: { page: p, limit: l, total, pages: Math.ceil(total / l) },
  });
});

/* GET /inventory/:productId */
export const getInventoryByProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const tenantModels = await getTenantModels(req);
  const Inventory = pickInventory(tenantModels);
  if (!Inventory) {
    res.status(500).json({ success: false, message: "Inventory model is not registered" });
    return;
  }

  const { productId } = req.params;

  if (!isValidObjectId(productId)) {
    res.status(400).json({ success: false, message: "Invalid product id" });
    return;
  }

  const inv = await Inventory.findOne({ tenant: req.tenant, product: productId })
    .populate("product", "title slug images")
    .lean();

  if (!inv) {
    res.status(404).json({ success: false, message: "Inventory not found" });
    return;
  }
  res.status(200).json({ success: true, data: inv });
});

/* POST /inventory/rebuild  (body: { productId? }) */
export const rebuildInventory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const tenantModels = await getTenantModels(req);
  const Inventory = pickInventory(tenantModels);
  const { Stockledger } = tenantModels as any;

  if (!Inventory) {
    res.status(500).json({ success: false, message: "Inventory model is not registered" });
    return;
  }
  if (!Stockledger) {
    res.status(500).json({ success: false, message: "Stockledger model is not registered" });
    return;
  }

  const { productId } = (req.body || {}) as { productId?: string };

  if (productId) {
    if (!isValidObjectId(productId)) {
      res.status(400).json({ success: false, message: "Invalid product id" });
      return;
    }
    const out = await recomputeInventoryForProduct({
      Inventory,
      Stockledger,
      tenant: req.tenant!,
      product: productId,
    });
    res.status(200).json({
      success: true,
      message: "Rebuilt product inventory",
      data: { productId, ...out },
    });
    return;
  }

  const out = await recomputeInventoryAll({ Inventory, Stockledger, tenant: req.tenant! });
  res.status(200).json({ success: true, message: "Rebuilt all inventories", data: out });
});

/* PATCH /inventory/:productId/safety (body: { safetyStock }) */
export const updateSafetyStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const tenantModels = await getTenantModels(req);
  const Inventory = pickInventory(tenantModels);
  if (!Inventory) {
    res.status(500).json({ success: false, message: "Inventory model is not registered" });
    return;
  }

  const { productId } = req.params;
  const { safetyStock } = req.body as { safetyStock: number };

  if (!isValidObjectId(productId)) {
    res.status(400).json({ success: false, message: "Invalid product id" });
    return;
  }
  const ss = Math.max(0, Number(safetyStock || 0));

  const inv = await Inventory.findOneAndUpdate(
    { tenant: req.tenant, product: productId },
    [
      { $setOnInsert: { tenant: req.tenant, product: productId, onHand: 0, reserved: 0, available: 0 } },
      { $set: { safetyStock: ss } },
      { $set: { isLow: { $lte: ["$available", ss] } } },
    ],
    { upsert: true, new: true }
  ).lean();

  res.status(200).json({ success: true, message: "Safety stock updated", data: inv });
});
