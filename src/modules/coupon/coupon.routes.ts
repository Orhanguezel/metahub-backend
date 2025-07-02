import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createCoupon,
  getAllCoupons,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
} from "./coupon.controller";
import {
  validateCreateCoupon,
  validateUpdateCoupon,
  validateObjectId,
  validateAdminQuery,
} from "./coupon.validation";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// ✅ Public - Check valid coupon by code
router.get("/check/:code", getCouponByCode);

// ✅ Admin routes (auth+role required)
router.use(authenticate, authorizeRoles("admin"));

// Get all coupons - only for admin
router.get("/", validateAdminQuery, getAllCoupons);

// Create new coupon (admin only)
router.post(
  "/",
  uploadTypeWrapper("coupons"),
  upload.array("images", 5), // Resimler yükleniyor (maks. 5 resim)
   transformNestedFields(["title", "description"]),
  validateCreateCoupon,
  createCoupon
);

// Update coupon (admin only)
router.put(
  "/:id",
  uploadTypeWrapper("coupons"),
  upload.array("images", 5), // Resimler yükleniyor (maks. 5 resim)
  transformNestedFields(["title", "description"]),
  validateUpdateCoupon,
  updateCoupon
);

// Delete coupon (admin only)
router.delete("/:id", validateObjectId("id"), deleteCoupon);

export default router;
