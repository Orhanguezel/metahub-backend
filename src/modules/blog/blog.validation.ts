import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateCreateBlog = [
  body("title").notEmpty().withMessage("Title is required."),
  body("slug").notEmpty().withMessage("Slug is required."),
  body("summary").notEmpty().withMessage("Summary is required."),
  body("content").notEmpty().withMessage("Content is required."),
  body("category").isMongoId().withMessage("Category ID must be a valid MongoDB ObjectId."),
  body("label.tr").notEmpty().withMessage("Label (TR) is required."),
  body("label.en").notEmpty().withMessage("Label (EN) is required."),
  body("label.de").notEmpty().withMessage("Label (DE) is required."),
  validateRequest,
];

export const validateUpdateBlog = [
  body("title").optional().isString().withMessage("Title must be a string."),
  body("slug").optional().isString().withMessage("Slug must be a string."),
  body("summary").optional().isString().withMessage("Summary must be a string."),
  body("content").optional().isString().withMessage("Content must be a string."),
  body("category").optional().isMongoId().withMessage("Category ID must be a valid MongoDB ObjectId."),
  body("label.tr").optional().isString().withMessage("Label (TR) must be a string."),
  body("label.en").optional().isString().withMessage("Label (EN) must be a string."),
  body("label.de").optional().isString().withMessage("Label (DE) must be a string."),
  validateRequest,
];

export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];
