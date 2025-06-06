import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";
import {
  createCoupon,
  getAllCoupons,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
} from "./coupon.controller";
import {
  createCouponValidator,
  updateCouponValidator,
} from "./coupon.validation";
import { validateObjectId } from "@/core/middleware/validateRequest";

const router = express.Router();

// ✅ Public - Check valid coupon by code
router.get("/check/:code", analyticsLogger, getCouponByCode);

// ✅ Admin routes (auth+role required)
router.use(authenticate, authorizeRoles("admin"));

router.get("/", analyticsLogger, getAllCoupons);

router.post("/", createCouponValidator, validateRequest, createCoupon);

router.put("/:id", updateCouponValidator, validateRequest, updateCoupon);

router.delete("/:id", validateObjectId("id"), validateRequest, deleteCoupon);

export default router;
