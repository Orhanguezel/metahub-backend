import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";


export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];


export const validateCreateNewsCategory = [
  body("name")
    .notEmpty()
    .withMessage("Name is required.")
    .isString()
    .withMessage("Name must be a string."),
  body("slug")
    .optional()
    .isString()
    .withMessage("Slug must be a string."),
  validateRequest,
];

export const validateUpdateNewsCategory = [
  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string."),
  body("slug")
    .optional()
    .isString()
    .withMessage("Slug must be a string."),
  validateRequest,
];
