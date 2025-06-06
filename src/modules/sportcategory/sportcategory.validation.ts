import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

export const validateCreateSportCategory = [
  body("name.tr").notEmpty().withMessage("Name (TR) is required."),
  body("name.en").notEmpty().withMessage("Name (EN) is required."),
  body("name.de").notEmpty().withMessage("Name (DE) is required."),
  validateRequest,
];

export const validateUpdateSportCategory = [
  body("name.tr").optional().isString().withMessage("Name (TR) must be a string."),
  body("name.en").optional().isString().withMessage("Name (EN) must be a string."),
  body("name.de").optional().isString().withMessage("Name (DE) must be a string."),
  validateRequest,
];
