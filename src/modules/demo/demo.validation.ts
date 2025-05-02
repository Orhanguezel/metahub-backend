// src/modules/demo/demo.validation.ts
import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create Validation
export const validateCreateDemo = [
  body("name").isString().notEmpty().withMessage("Name is required."),
  validateRequest,
];

// ✅ ID Param Validation
export const validateDemoIdParam = [
  param("id").isMongoId().withMessage("Invalid demo ID."),
  validateRequest,
];
