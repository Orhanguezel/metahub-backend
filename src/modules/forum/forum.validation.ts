import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Forum Category
export const validateCreateCategory = [
  body("name.tr").notEmpty().withMessage("Name (TR) is required."),
  body("name.en").notEmpty().withMessage("Name (EN) is required."),
  body("name.de").notEmpty().withMessage("Name (DE) is required."),
  validateRequest,
];

// ✅ Forum Topic
export const validateCreateTopic = [
  body("title.tr").notEmpty().withMessage("Title (TR) is required."),
  body("title.en").notEmpty().withMessage("Title (EN) is required."),
  body("title.de").notEmpty().withMessage("Title (DE) is required."),
  body("content.tr").notEmpty().withMessage("Content (TR) is required."),
  body("content.en").notEmpty().withMessage("Content (EN) is required."),
  body("content.de").notEmpty().withMessage("Content (DE) is required."),
  body("category").isMongoId().withMessage("Valid category ID is required."),
  validateRequest,
];

// ✅ Forum Comment
export const validateCreateComment = [
  body("content.tr").notEmpty().withMessage("Content (TR) is required."),
  body("content.en").notEmpty().withMessage("Content (EN) is required."),
  body("content.de").notEmpty().withMessage("Content (DE) is required."),
  body("topic").isMongoId().withMessage("Valid topic ID is required."),
  validateRequest,
];

export const validateParamId = [
  param("id").isMongoId().withMessage("Valid ID is required."),
  validateRequest,
];
