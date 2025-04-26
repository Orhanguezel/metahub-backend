import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ ID validation
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// ✅ Create News Validation
export const validateCreateNews = [
  body("title_tr").notEmpty().withMessage("Title (TR) is required."),
  body("summary_tr").notEmpty().withMessage("Summary (TR) is required."),
  body("content_tr").notEmpty().withMessage("Content (TR) is required."),

  body("title_en").notEmpty().withMessage("Title (EN) is required."),
  body("summary_en").notEmpty().withMessage("Summary (EN) is required."),
  body("content_en").notEmpty().withMessage("Content (EN) is required."),

  body("title_de").notEmpty().withMessage("Title (DE) is required."),
  body("summary_de").notEmpty().withMessage("Summary (DE) is required."),
  body("content_de").notEmpty().withMessage("Content (DE) is required."),

  validateRequest,
];

// ✅ Update News Validation
export const validateUpdateNews = [
  body("title").optional().isObject().withMessage("Title must be an object."),
  body("summary").optional().isObject().withMessage("Summary must be an object."),
  body("content").optional().isObject().withMessage("Content must be an object."),
  body("category").optional().isString().withMessage("Category must be a string."),
  body("tags").optional().isArray().withMessage("Tags must be an array."),
  body("isPublished").optional().isBoolean().withMessage("isPublished must be true or false."),
  body("publishedAt").optional().isISO8601().withMessage("publishedAt must be a valid ISO8601 date."),
  validateRequest,
];
