import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import StockMovement from "./stockmovement.models";
import { isValidObjectId } from "../../core/utils/validation";

// ➕ Yeni stok hareketi oluştur
export const createStockMovement = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { product, type, quantity, note } = req.body;

  if (!product || !type || typeof quantity !== "number") {
    res.status(400).json({
      message: req.locale === "de"
        ? "Produkt, Typ und Menge sind erforderlich."
        : req.locale === "tr"
        ? "Ürün, tür ve miktar zorunludur."
        : "Product, type and quantity are required.",
    });
    return;
  }

  if (!isValidObjectId(product)) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Ungültige Produkt-ID."
        : req.locale === "tr"
        ? "Geçersiz ürün ID."
        : "Invalid product ID.",
    });
    return;
  }

  const movement = await StockMovement.create({
    product,
    type,
    quantity,
    note,
    createdBy: req.user?._id || null,
  });

  res.status(201).json({
    success: true,
    message: req.locale === "de"
      ? "Bestandsbewegung erfolgreich erstellt."
      : req.locale === "tr"
      ? "Stok hareketi başarıyla kaydedildi."
      : "Stock movement recorded successfully.",
    movement,
  });
});

// 📄 Tüm stok hareketlerini getir
export const getStockMovements = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { product } = req.query;
  const filter: any = {};

  if (product) {
    if (!isValidObjectId(product)) {
      res.status(400).json({
        message: req.locale === "de"
          ? "Ungültige Produkt-ID."
          : req.locale === "tr"
          ? "Geçersiz ürün ID."
          : "Invalid product ID.",
      });
      return;
    }
    filter.product = product;
  }

  const movements = await StockMovement.find(filter)
    .populate("product", "name")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(movements);
});

