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

// coupon.routes.ts
router.get("/", getCoupons);
router.get("/check/:code", getCouponByCode);

// Admin (auth)
router.use(authenticate, authorizeRoles("admin"));

// ✔ Admin list
router.get("/admin", validateAdminQuery, getAllCoupons);

// ✔ Admin create
router.post(
  "/admin",
  uploadTypeWrapper("coupons"),
  upload("coupons").array("images", 5),
  transformNestedFields(["title", "description"]),
  validateCreateCoupon,
  createCoupon
);

// ✔ Admin update
router.put(
  "/admin/:id",
  uploadTypeWrapper("coupons"),
  upload("coupons").array("images", 5),
  transformNestedFields(["title", "description"]),
  validateUpdateCoupon,
  updateCoupon
);

// ✔ Admin delete
router.delete("/admin/:id", validateObjectId("id"), deleteCoupon);


export default router;
