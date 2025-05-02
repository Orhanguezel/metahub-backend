import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create Invoice Validator
export const validateCreateInvoice = [
  body("order").notEmpty().withMessage("Order ID is required."),
  validateRequest,
];

// ✅ ID Param Validator
export const validateInvoiceIdParam = [
  param("id").isMongoId().withMessage("Invalid invoice ID."),
  validateRequest,
];
