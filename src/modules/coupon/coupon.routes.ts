import express from "express";
import {
  createCoupon,
  getAllCoupons,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
} from "./coupon.controller";

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// Public - Check valid coupon by code
router.get("/check/:code", getCouponByCode);

// Admin Routes
router.post("/", authenticate, authorizeRoles("admin"), createCoupon);
router.get("/", authenticate, authorizeRoles("admin"), getAllCoupons);
router.put("/:id", authenticate, authorizeRoles("admin"), updateCoupon);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteCoupon);

export default router;
