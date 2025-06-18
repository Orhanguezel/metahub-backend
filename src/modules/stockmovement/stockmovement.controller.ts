import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ➕ Create new stock movement
export const createStockMovement = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { Stockmovement } = await getTenantModels(req);
      const { product, type, quantity, note } = req.body;

      if (!product || !type || typeof quantity !== "number") {
        res
          .status(400)
          .json({ message: "Product, type and quantity are required." });
        return;
      }

      if (!isValidObjectId(product)) {
        res.status(400).json({ message: "Invalid product ID." });
        return;
      }

      const movement = await Stockmovement.create({
        product,
        type,
        tenant: req.tenant,
        quantity,
        note,
        createdBy: req.user?._id || null,
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

// 📄 Get all stock movements
export const getStockMovements = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { Stockmovement } = await getTenantModels(req);
    try {
      const { product } = req.query;
      const filter: any = { tenant: req.tenant };

      if (product) {
        if (!isValidObjectId(product)) {
          res.status(400).json({ message: "Invalid product ID." });
          return;
        }
        filter.product = product;
      }

      const movements = await Stockmovement.find(filter)
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
