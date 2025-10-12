import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { MovementType, CanonicalMovementType } from "./types";

/** Legacy → kanonik tip eşleyici */
function normalizeType(t: string): CanonicalMovementType | null {
  const k = String(t || "").toLowerCase().trim() as MovementType;
  switch (k) {
    // kanonik
    case "in":
    case "out":
    case "reserve":
    case "release":
    case "return":
    case "adjust":
      return k;
    // legacy → kanonik
    case "increase": return "in";
    case "decrease": return "out";
    case "order":    return "reserve";
    case "manual":   return "adjust";
    default: return null;
  }
}

/** ➕ Yeni stok hareketi oluştur */
export const createStockledger = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantModels = await getTenantModels(req);
      const { Stockledger } = tenantModels as any;

      // Inventory bazı projelerde Inventory, bazılarında InventoryModel olarak kayıtlı olabilir.
      const Inventory =
        (tenantModels as any).Inventory ||
        (tenantModels as any).InventoryModel;

      const { product, type, quantity, note } = req.body;

      if (!product || type == null || typeof quantity !== "number") {
        res.status(400).json({
          success: false,
          message: "Product, type and quantity are required.",
        });
        return;
      }
      if (!isValidObjectId(product)) {
        res.status(400).json({ success: false, message: "Invalid product ID." });
        return;
      }

      const norm = normalizeType(type);
      if (!norm) {
        res.status(400).json({ success: false, message: "Invalid movement type." });
        return;
      }

      const movement = await Stockledger.create({
        product,
        type: norm, // DB’ye kanonik tipi yaz
        tenant: req.tenant,
        quantity,
        note,
        createdBy: req.user?._id || null,
      });

      // envanter servisinde kanonik tip gönderelim
      const { applyStockLedgerToInventory } = await import("@/modules/inventory/service");
      await applyStockLedgerToInventory({
        Inventory,
        tenant: req.tenant!,
        product,
        movementId: movement._id,
        movementType: norm,                // ← DÜZELTME: kanonik tip
        quantity,
        movementAt: movement.createdAt,
      });

      res.status(201).json({
        success: true,
        message: "Stock movement recorded successfully.",
        data: movement,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

/** 📄 Stok hareket listesi */
export const getStockledgers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { Stockledger } = await getTenantModels(req);

      const { product, type } = req.query as { product?: string; type?: string };

      const filter: any = { tenant: req.tenant };
      if (product) {
        if (!isValidObjectId(product)) {
          res.status(400).json({ success: false, message: "Invalid product ID." });
          return;
        }
        filter.product = product;
      }
      if (type) {
        const norm = normalizeType(type);
        if (!norm) {
          res.status(400).json({ success: false, message: "Invalid movement type." });
          return;
        }
        filter.type = norm;
      }

      const movements = await Stockledger.find(filter)
        .populate("product", "name")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        message: "Stock movements fetched successfully.",
        data: movements,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);
