import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import StockMovement from "./stockmovement.models";

// ➕ Yeni hareket ekle
export const createStockMovement = asyncHandler(
  async (req: Request, res: Response) => {
    const { product, type, quantity, note } = req.body;

    const movement = await StockMovement.create({
      product,
      type,
      quantity,
      note,
      createdBy: req.user?._id || null,
    });

    res.status(201).json({
      message: "Stock movement recorded",
      movement,
    });
  }
);

// 📄 Tüm hareketleri getir
export const getStockMovements = asyncHandler(
  async (req: Request, res: Response) => {
    const { product } = req.query;

    const filter: any = {};
    if (product) filter.product = product;

    const movements = await StockMovement.find(filter)
      .populate("product", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(movements);
  }
);
