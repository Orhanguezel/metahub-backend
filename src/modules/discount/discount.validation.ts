// src/modules/discount/discount.validation.ts
import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create Discount Validation
export const validateCreateDiscount = [
  body("code").notEmpty().withMessage("Coupon code is required."),
  body("discountPercentage")
    .isFloat({ min: 1, max: 100 })
    .withMessage("Discount must be between 1 and 100."),
  body("validFrom").notEmpty().withMessage("Valid from date is required."),
  body("validUntil").notEmpty().withMessage("Valid until date is required."),
  validateRequest,
];

// ✅ ID Param Validation
export const validateDiscountIdParam = [
  param("id").isMongoId().withMessage("Discount ID must be a valid MongoDB ObjectId."),
  validateRequest,
];
