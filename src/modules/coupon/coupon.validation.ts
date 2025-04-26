import { body } from "express-validator";

export const createCouponValidator = [
  body("code").notEmpty().withMessage("Coupon code is required."),
  body("discount").isFloat({ min: 1, max: 100 }).withMessage("Discount must be between 1 and 100."),
  body("expiresAt").notEmpty().withMessage("Expiration date is required."),
  body("label.title.tr").notEmpty().withMessage("Turkish title is required."),
  body("label.title.en").notEmpty().withMessage("English title is required."),
  body("label.title.de").notEmpty().withMessage("German title is required."),
];

export const updateCouponValidator = [
  body("discount").optional().isFloat({ min: 1, max: 100 }).withMessage("Discount must be between 1 and 100."),
  body("expiresAt").optional(),
  body("isActive").optional().isBoolean(),
];
