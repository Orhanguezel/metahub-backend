// src/modules/articles/articles.validation.ts
import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { isValidObjectId } from "@/core/utils/validation";

// ➕ Create Article validation
export const validateCreateArticle = [
  body("tr.title").isString().notEmpty().withMessage("Turkish title is required."),
  body("en.title").isString().notEmpty().withMessage("English title is required."),
  body("de.title").isString().notEmpty().withMessage("German title is required."),
  body("tr.summary").isString().notEmpty().withMessage("Turkish summary is required."),
  body("en.summary").isString().notEmpty().withMessage("English summary is required."),
  body("de.summary").isString().notEmpty().withMessage("German summary is required."),
  validateRequest,
];

// ✏️ Update Article validation
export const validateUpdateArticle = [
  body("title").optional().isString(),
  body("summary").optional().isString(),
  body("content").optional().isString(),
  body("slug").optional().isString(),
  body("category").optional().isString(),
  validateRequest,
];

// 🔍 Validate ID param
export const validateArticleId = [
  param("id")
    .custom((value) => isValidObjectId(value))
    .withMessage("Invalid article ID."),
  validateRequest,
];
