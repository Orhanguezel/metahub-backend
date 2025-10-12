import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateListInventory = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("low").optional().isBoolean().toBoolean(),
  validateRequest,
];

export const validateGetInventory = [
  param("productId").isMongoId().withMessage("Invalid product id"),
  validateRequest,
];

export const validateRebuildInventory = [
  body("productId").optional().isMongoId().withMessage("Invalid product id"),
  validateRequest,
];

export const validateUpdateSafety = [
  param("productId").isMongoId().withMessage("Invalid product id"),
  body("safetyStock").notEmpty().isFloat({ min: 0 }).withMessage("safetyStock must be >= 0"),
  validateRequest,
];
