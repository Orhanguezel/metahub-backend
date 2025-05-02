import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🎯 ID validation
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid Mongo ID.`),
  validateRequest,
];

// 🎯 Create validation
export const validateCreateService = [
  body("title.tr").notEmpty().withMessage("Title (TR) is required."),
  body("title.en").notEmpty().withMessage("Title (EN) is required."),
  body("title.de").notEmpty().withMessage("Title (DE) is required."),

  body("shortDescription.tr").notEmpty().withMessage("Short description (TR) is required."),
  body("shortDescription.en").notEmpty().withMessage("Short description (EN) is required."),
  body("shortDescription.de").notEmpty().withMessage("Short description (DE) is required."),

  body("detailedDescription.tr").notEmpty().withMessage("Detailed description (TR) is required."),
  body("detailedDescription.en").notEmpty().withMessage("Detailed description (EN) is required."),
  body("detailedDescription.de").notEmpty().withMessage("Detailed description (DE) is required."),

  body("price").notEmpty().isNumeric().withMessage("Price must be a number."),
  body("durationMinutes").optional().isInt({ min: 1 }).withMessage("Duration must be at least 1 minute."),

  validateRequest,
];

// 🎯 Update validation
export const validateUpdateService = [
  body("title").optional().isObject().withMessage("Title must be an object."),
  body("shortDescription").optional().isObject().withMessage("Short description must be an object."),
  body("detailedDescription").optional().isObject().withMessage("Detailed description must be an object."),
  body("price").optional().isNumeric().withMessage("Price must be a number."),
  body("durationMinutes").optional().isInt({ min: 1 }).withMessage("Duration must be at least 1 minute."),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false."),
  body("isPublished").optional().isBoolean().withMessage("isPublished must be true or false."),
  validateRequest,
];
