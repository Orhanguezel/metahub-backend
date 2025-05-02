import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create Spare Part Validation
export const validateCreateSparePart = [
  body("label.tr").notEmpty().withMessage("Label (TR) is required."),
  body("label.en").notEmpty().withMessage("Label (EN) is required."),
  body("label.de").notEmpty().withMessage("Label (DE) is required."),
  body("slug").notEmpty().withMessage("Slug is required."),
  body("price").notEmpty().isFloat({ min: 0 }).withMessage("Price must be a positive number."),
  validateRequest,
];

// ✅ Update Spare Part Validation
export const validateUpdateSparePart = [
  body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number."),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer."),
  validateRequest,
];

// ✅ Param ID Validation
export const validateSparePartId = [
  param("id").isMongoId().withMessage("Invalid spare part ID."),
  validateRequest,
];
