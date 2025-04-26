import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";
import {
  createCoupon,
  getAllCoupons,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
} from "./coupon.controller";
import { createCouponValidator, updateCouponValidator } from "./coupon.validation";

const router = express.Router();

// ✅ Public - Check valid coupon by code
router.get("/check/:code", getCouponByCode);

// ✅ Admin routes
router.use(authenticate, authorizeRoles("admin"));

router.get("/", getAllCoupons);

router.post(
  "/",
  createCouponValidator,
  validateRequest,
  createCoupon
);

router.put(
  "/:id",
  updateCouponValidator,
  validateRequest,
  updateCoupon
);

router.delete("/:id", deleteCoupon);

export default router;
