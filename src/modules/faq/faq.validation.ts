import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create FAQ Validation
export const validateCreateFAQ = [
  body("question.tr").notEmpty().withMessage("Question (TR) is required."),
  body("question.en").notEmpty().withMessage("Question (EN) is required."),
  body("question.de").notEmpty().withMessage("Question (DE) is required."),
  body("answer.tr").notEmpty().withMessage("Answer (TR) is required."),
  body("answer.en").notEmpty().withMessage("Answer (EN) is required."),
  body("answer.de").notEmpty().withMessage("Answer (DE) is required."),
  validateRequest,
];

// ✅ Update FAQ Validation
export const validateUpdateFAQ = [
  param("id").isMongoId().withMessage("Invalid FAQ ID."),
  body("question.tr").optional().notEmpty(),
  body("question.en").optional().notEmpty(),
  body("question.de").optional().notEmpty(),
  body("answer.tr").optional().notEmpty(),
  body("answer.en").optional().notEmpty(),
  body("answer.de").optional().notEmpty(),
  validateRequest,
];

// ✅ ID Param Validation (for delete)
export const validateFAQId = [
  param("id").isMongoId().withMessage("Invalid FAQ ID."),
  validateRequest,
];
