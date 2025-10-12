// src/modules/pricing/validation.ts
import { body } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateQuote = [
  body("currency").notEmpty().isString(),
  body("shippingMethodCode").notEmpty().isString(),
  body("items").isArray({ min: 1 }),
  body("items.*.productId").notEmpty().isString(),
  body("items.*.qty").isInt({ min: 1 }),
  body("items.*.price_cents").isInt({ min: 0 }),
  body("items.*.offer_price_cents").optional().isInt({ min: 0 }),
  body("items.*.currency").notEmpty().isString(),
  body("shippingAddress").isObject(),
  body("couponCode").optional().isString(),
  body("feeFlags").optional().isArray(),
  validateRequest,
];
