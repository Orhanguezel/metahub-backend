import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createCoupon,
  getCoupons,
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
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

router.get("/", getCoupons);

// ✅ Public - Check valid coupon by code
router.get("/check/:code", getCouponByCode);

// ✅ Admin routes (auth+role required)
router.use(authenticate, authorizeRoles("admin"));

// Get all coupons (admin only)
router.get("/admin", validateAdminQuery, getAllCoupons);

// Create new coupon (admin only)
router.post(
  "/",
  uploadTypeWrapper("coupons"),
  upload("coupons").array("images", 5),
  transformNestedFields(["title", "description"]),
  validateCreateCoupon,
  createCoupon
);

// Update coupon (admin only)
router.put(
  "/:id",
  uploadTypeWrapper("coupons"),
  upload("coupons").array("images", 5),
  transformNestedFields(["title", "description"]),
  validateUpdateCoupon,
  updateCoupon
);

// Delete coupon (admin only)
router.delete("/:id", validateObjectId("id"), deleteCoupon);

export default router;
