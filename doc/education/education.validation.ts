import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create Validation
export const validateCreateEducation = [
  body("degree.tr").notEmpty().withMessage("Degree (TR) is required."),
  body("degree.en").notEmpty().withMessage("Degree (EN) is required."),
  body("degree.de").notEmpty().withMessage("Degree (DE) is required."),
  body("institution.tr").notEmpty().withMessage("Institution (TR) is required."),
  body("institution.en").notEmpty().withMessage("Institution (EN) is required."),
  body("institution.de").notEmpty().withMessage("Institution (DE) is required."),
  body("period").notEmpty().withMessage("Period is required."),
  validateRequest,
];

// ✅ Update Validation (optional fields)
export const validateUpdateEducation = [
  body("degree.tr").optional().notEmpty().withMessage("Degree (TR) cannot be empty."),
  body("degree.en").optional().notEmpty().withMessage("Degree (EN) cannot be empty."),
  body("degree.de").optional().notEmpty().withMessage("Degree (DE) cannot be empty."),
  body("institution.tr").optional().notEmpty().withMessage("Institution (TR) cannot be empty."),
  body("institution.en").optional().notEmpty().withMessage("Institution (EN) cannot be empty."),
  body("institution.de").optional().notEmpty().withMessage("Institution (DE) cannot be empty."),
  body("period").optional().notEmpty().withMessage("Period cannot be empty."),
  validateRequest,
];

// ✅ ID Param Validation
export const validateEducationIdParam = [
  param("id").isMongoId().withMessage("Education ID must be a valid MongoDB ObjectId."),
  validateRequest,
];
