import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create Feedback
export const validateCreateFeedback = [
  body("name").notEmpty().withMessage("Name is required."),
  body("email").isEmail().withMessage("A valid email is required."),
  body("message.tr").notEmpty().withMessage("Message (TR) is required."),
  body("message.en").notEmpty().withMessage("Message (EN) is required."),
  body("message.de").notEmpty().withMessage("Message (DE) is required."),
  body("rating").optional().isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5."),
  validateRequest,
];

// ✅ Update Feedback (Admin)
export const validateUpdateFeedback = [
  body("name").optional().isString(),
  body("email").optional().isEmail(),
  body("message.tr").optional().isString(),
  body("message.en").optional().isString(),
  body("message.de").optional().isString(),
  body("rating").optional().isInt({ min: 1, max: 5 }),
  body("isPublished").optional().isBoolean(),
  body("isActive").optional().isBoolean(),
  validateRequest,
];

// ✅ ID Param Check
export const validateFeedbackId = [
  param("id").isMongoId().withMessage("Invalid feedback ID."),
  validateRequest,
];
