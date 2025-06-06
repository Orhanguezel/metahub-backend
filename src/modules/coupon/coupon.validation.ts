import { body } from "express-validator";

export const createCouponValidator = [
  body("code").notEmpty().withMessage("Coupon code is required."),
  body("discount").isFloat({ min: 1, max: 100 }).withMessage("Discount must be between 1 and 100."),
  body("expiresAt")
    .notEmpty().withMessage("Expiration date is required.")
    .isISO8601().withMessage("Expiration date must be a valid date (ISO8601)."),
  body("label.title.tr").notEmpty().withMessage("Turkish title is required."),
  body("label.title.en").notEmpty().withMessage("English title is required."),
  body("label.title.de").notEmpty().withMessage("German title is required."),
  body("label.description.tr").notEmpty().withMessage("Turkish description is required."),
  body("label.description.en").notEmpty().withMessage("English description is required."),
  body("label.description.de").notEmpty().withMessage("German description is required."),
];

export const updateCouponValidator = [
  body("code").optional().notEmpty(),
  body("discount").optional().isFloat({ min: 1, max: 100 }),
  body("expiresAt").optional().isISO8601(),
  body("isActive").optional().isBoolean(),
  body("label.title.tr").optional().notEmpty(),
  body("label.title.en").optional().notEmpty(),
  body("label.title.de").optional().notEmpty(),
  body("label.description.tr").optional().notEmpty(),
  body("label.description.en").optional().notEmpty(),
  body("label.description.de").optional().notEmpty(),
];


