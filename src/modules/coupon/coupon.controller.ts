import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { Coupon } from "@/modules/coupon";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Coupon
export const createCoupon = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { code, discount, expiresAt, label } = req.body;

  const codeUpper = code.toUpperCase().trim();
  const existing = await Coupon.findOne({ code: codeUpper });

  if (existing) {
    res.status(409).json({ success: false, message: "Coupon code already exists." });
    return;
  }

  const coupon = await Coupon.create({
    code: codeUpper,
    discount,
    expiresAt,
    label,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: "Coupon created successfully.",
    data: coupon,
  });
});


// ✅ Get All Coupons
export const getAllCoupons = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const language = (req.query.lang as string) || "en";
    const coupons = await Coupon.find({ [`label.title.${language}`]: { $exists: true } }).sort({ createdAt: -1 });

    res.status(200).json(coupons);
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Get Coupon By Code
export const getCouponByCode = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.params;
    const language = (req.query.lang as string) || "en";

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      [`label.title.${language}`]: { $exists: true },
    });

    if (!coupon) {
      res.status(404).json({ message: "Coupon not found." });
      return;
    }

    res.status(200).json(coupon);
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Update Coupon
export const updateCoupon = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { code, discount, expiresAt, isActive, label } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid coupon ID." });
      return;
    }

    const coupon = await Coupon.findById(id);

    if (!coupon) {
      res.status(404).json({ message: "Coupon not found." });
      return;
    }

    if (code) coupon.code = code.toUpperCase().trim();
    if (discount !== undefined) coupon.discount = discount;
    if (expiresAt) coupon.expiresAt = new Date(expiresAt);
    if (typeof isActive === "boolean") coupon.isActive = isActive;
    if (label) coupon.label = label;

    await coupon.save();

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully.",
      coupon,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Delete Coupon
export const deleteCoupon = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid coupon ID." });
      return;
    }

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      res.status(404).json({ message: "Coupon not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully.",
    });
    return;
  } catch (error) {
    next(error);
  }
});
