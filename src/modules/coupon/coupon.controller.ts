// src/modules/coupon/coupon.controller.ts

import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
//import { Coupon } from "./coupon.models";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Create Coupon
export const createCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const { code, discount, expiresAt, label } = req.body;
    const { Coupon } = await getTenantModels(req);

    const codeUpper = code.toUpperCase().trim();
    const exists = await Coupon.findOne({
      code: codeUpper,
      tenant: req.tenant,
    });
    if (exists) {
      res
        .status(409)
        .json({ success: false, message: "Coupon code already exists." });
      return;
    }

    const coupon = await Coupon.create({
      code: codeUpper,
      tenant: req.tenant,
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
  }
);

// ✅ Get All Coupons (Admin)
export const getAllCoupons = asyncHandler(
  async (req: Request, res: Response) => {
    const lang = (req.query.lang as string) || "en";
    const { Coupon } = await getTenantModels(req);
    const coupons = await Coupon.find({ lang, tenant: req.tenant }).sort({
      createdAt: -1,
    });

    // Eğer frontend diline göre filtrelemek istiyorsan:
    // const coupons = await Coupon.find({ [`label.title.${lang}`]: { $exists: true } }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: coupons });
  }
);

// ✅ Get Coupon By Code (Public — Kullanıcı checkout'ta girdiğinde)
export const getCouponByCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.params;
    const lang = (req.query.lang as string) || "en";
    const { Coupon } = await getTenantModels(req);

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      tenant: req.tenant,
      isActive: true,
      expiresAt: { $gte: new Date() },
      [`label.title.${lang}`]: { $exists: true },
    });

    if (!coupon) {
      res
        .status(404)
        .json({ success: false, message: "Coupon not found or expired." });
      return;
    }

    res.status(200).json({ success: true, data: coupon });
  }
);

// ✅ Update Coupon (Admin)
export const updateCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { code, discount, expiresAt, isActive, label } = req.body;
    const { Coupon } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid coupon ID." });
      return;
    }

    const coupon = await Coupon.findOne({ _id: id, tenant: req.tenant });
    if (!coupon) {
      res.status(404).json({ success: false, message: "Coupon not found." });
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
      data: coupon,
    });
  }
);

// ✅ Delete Coupon (Admin)
export const deleteCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Coupon } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid coupon ID." });
      return;
    }

    const coupon = await Coupon.deleteOne({ _id: id, tenant: req.tenant });

    if (!coupon) {
      res.status(404).json({ success: false, message: "Coupon not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully.",
    });
  }
);
