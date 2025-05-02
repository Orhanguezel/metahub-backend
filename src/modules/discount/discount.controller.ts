// src/modules/discount/discount.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import Discount from "./discount.model";
import { Category } from "@/modules/category";
import { Product } from "@/modules/product";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Get All Discounts
export const getAllDiscounts = asyncHandler(async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const discounts = await Discount.find()
      .populate("categoryId", "name")
      .populate("productId", "name price");
    res.status(200).json({
      success: true,
      data: discounts,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Create Discount
export const createDiscount = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, discountPercentage, validFrom, validUntil, categoryId, productId, isActive } = req.body;

    if (categoryId && !(await Category.findById(categoryId))) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    if (productId && !(await Product.findById(productId))) {
      res.status(400).json({ success: false, message: "Invalid product ID." });
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
      message: "Discount code created successfully.",
      data: discount,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Apply Discount
export const applyDiscount = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, cartTotal, productId, categoryId } = req.body;
    const discount = await Discount.findOne({ code });

    if (!discount) {
      res.status(404).json({ success: false, message: "Invalid discount code." });
      return;
    }

    const now = new Date();
    if (!discount.isActive || now < discount.validFrom || now > discount.validUntil) {
      res.status(400).json({ success: false, message: "Discount code is not currently valid." });
      return;
    }

    if (discount.productId && discount.productId.toString() !== productId) {
      res.status(400).json({ success: false, message: "Discount not valid for this product." });
      return;
    }

    if (discount.categoryId && discount.categoryId.toString() !== categoryId) {
      res.status(400).json({ success: false, message: "Discount not valid for this category." });
      return;
    }

    const discountAmount = (cartTotal * discount.discountPercentage) / 100;
    const newTotal = cartTotal - discountAmount;

    res.status(200).json({
      success: true,
      message: "Discount applied successfully.",
      discountAmount,
      newTotal,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Delete Discount
export const deleteDiscount = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid discount ID." });
      return;
    }

    const discount = await Discount.findByIdAndDelete(id);

    if (!discount) {
      res.status(404).json({ success: false, message: "Discount not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Discount deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});
