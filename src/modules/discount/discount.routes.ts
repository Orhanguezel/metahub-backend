// src/modules/discount/discount.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";
import {
  getAllDiscounts,
  createDiscount,
  applyDiscount,
  deleteDiscount,
} from "./discount.controller";
import { validateCreateDiscount, validateDiscountIdParam } from "./discount.validation";

const router = express.Router();

// ✅ Public - Apply discount
router.post("/apply", applyDiscount);

// ✅ Admin routes
router.use(authenticate, authorizeRoles("admin"));

router.get("/", getAllDiscounts);

router.post(
  "/",
  validateCreateDiscount,
  createDiscount
);

router.delete(
  "/:id",
  validateDiscountIdParam,
  deleteDiscount
);

export default router;
