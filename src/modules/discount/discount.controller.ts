// src/controllers/discount.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Discount from "./discount.model";
import { Category } from "../category";
import { Product } from "../product";


// 📄 Tüm indirimleri getir
export const getAllDiscounts = asyncHandler(async (_req: Request, res: Response) => {
  const discounts = await Discount.find()
    .populate("categoryId", "name")
    .populate("productId", "name price");
  res.status(200).json(discounts);
});

// ➕ Yeni indirim oluştur
export const createDiscount = asyncHandler(async (req: Request, res: Response) => {
  const { code, discountPercentage, validFrom, validUntil, categoryId, productId, isActive } = req.body;

  if (categoryId && !(await Category.findById(categoryId))) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Ungültige Kategorie-ID."
        : req.locale === "tr"
        ? "Geçersiz kategori ID."
        : "Invalid category ID.",
    });
    return;
  }

  if (productId && !(await Product.findById(productId))) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Ungültige Produkt-ID."
        : req.locale === "tr"
        ? "Geçersiz ürün ID."
        : "Invalid product ID.",
    });
    return;
  }

  const discount = await Discount.create({
    code,
    discountPercentage,
    validFrom,
    validUntil,
    categoryId,
    productId,
    isActive,
  });

  res.status(201).json({
    success: true,
    message: req.locale === "de"
      ? "Rabattcode erfolgreich erstellt."
      : req.locale === "tr"
      ? "İndirim kodu başarıyla oluşturuldu."
      : "Discount code created successfully.",
    discount,
  });
});

// ✅ İndirim kodu uygula
export const applyDiscount = asyncHandler(async (req: Request, res: Response) => {
  const { code, cartTotal, productId, categoryId } = req.body;
  const discount = await Discount.findOne({ code });

  if (!discount) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Ungültiger Rabattcode."
        : req.locale === "tr"
        ? "Geçersiz indirim kodu."
        : "Invalid discount code.",
    });
    return;
  }

  const now = new Date();
  if (!discount.isActive || now < discount.validFrom || now > discount.validUntil) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Rabattcode ist derzeit nicht gültig."
        : req.locale === "tr"
        ? "İndirim kodu şu anda geçerli değil."
        : "Discount code is not currently valid.",
    });
    return;
  }

  if (discount.productId && discount.productId.toString() !== productId) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Dieser Rabatt gilt nicht für dieses Produkt."
        : req.locale === "tr"
        ? "Bu indirim bu ürün için geçerli değil."
        : "Discount not valid for this product.",
    });
    return;
  }

  if (discount.categoryId && discount.categoryId.toString() !== categoryId) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Dieser Rabatt gilt nicht für diese Kategorie."
        : req.locale === "tr"
        ? "Bu indirim bu kategori için geçerli değil."
        : "Discount not valid for this category.",
    });
    return;
  }

  const discountAmount = (cartTotal * discount.discountPercentage) / 100;
  const newTotal = cartTotal - discountAmount;

  res.status(200).json({
    message: req.locale === "de"
      ? "Rabatt erfolgreich angewendet."
      : req.locale === "tr"
      ? "İndirim başarıyla uygulandı."
      : "Discount applied successfully.",
    discountAmount,
    newTotal,
  });
});

// ❌ İndirim sil
export const deleteDiscount = asyncHandler(async (req: Request, res: Response) => {
  const discount = await Discount.findByIdAndDelete(req.params.id);

  if (!discount) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Rabatt nicht gefunden."
        : req.locale === "tr"
        ? "İndirim kodu bulunamadı."
        : "Discount not found.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Rabatt gelöscht."
      : req.locale === "tr"
      ? "İndirim kodu silindi."
      : "Discount deleted successfully.",
  });
});
