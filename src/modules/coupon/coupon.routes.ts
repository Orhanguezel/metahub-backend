// src/modules/coupon/routes.ts (veya router dosyan)
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createCoupon,
  getCoupons,
  getAllCoupons,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
  getCouponByIdAdmin, // <-- EKLENDİ
} from "./coupon.controller";
import {
  validateCreateCoupon,
  validateUpdateCoupon,
  validateObjectId,
  validateAdminQuery,
} from "./validation";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

/* ===== Public ===== */
router.get("/", getCoupons);
router.get("/check/:code", getCouponByCode);

/* ===== Admin ===== */
router.use(authenticate, authorizeRoles("admin"));

router.get("/admin", validateAdminQuery, getAllCoupons);
router.get("/admin/:id", validateObjectId("id"), getCouponByIdAdmin); // <-- EKLENDİ

router.post(
  "/admin",
  uploadTypeWrapper("coupons"),
  upload("coupons").array("images", 5),
  transformNestedFields(["title", "description"]),
  validateCreateCoupon,
  createCoupon
);

router.put(
  "/admin/:id",
  uploadTypeWrapper("coupons"),
  upload("coupons").array("images", 5),
  transformNestedFields(["title", "description"]),
  validateObjectId("id"),
  validateUpdateCoupon,
  updateCoupon
);

router.delete("/admin/:id", validateObjectId("id"), deleteCoupon);

export default router;
