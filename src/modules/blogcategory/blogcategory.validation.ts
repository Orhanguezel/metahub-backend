import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";


export const validateCreateBlogCategory = [
  body("name")
    .notEmpty()
    .withMessage("Category name is required.")
    .isString()
    .withMessage("Category name must be a string."),
  body("slug")
    .optional()
    .isString()
    .withMessage("Slug must be a string."),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string."),
  validateRequest,
];

export const validateUpdateBlogCategory = [
  body("name")
    .optional()
    .isString()
    .withMessage("Category name must be a string."),
  body("slug")
    .optional()
    .isString()
    .withMessage("Slug must be a string."),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string."),
  validateRequest,
];


export const validateObjectIdParam = [
  param("id")
    .isMongoId()
    .withMessage("Invalid ID format."),
  validateRequest,
];
