import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateCreateExperience = [
  body("position.tr").notEmpty().withMessage("Position (TR) is required."),
  body("position.en").notEmpty().withMessage("Position (EN) is required."),
  body("position.de").notEmpty().withMessage("Position (DE) is required."),
  body("company.tr").notEmpty().withMessage("Company (TR) is required."),
  body("company.en").notEmpty().withMessage("Company (EN) is required."),
  body("company.de").notEmpty().withMessage("Company (DE) is required."),
  body("period").notEmpty().withMessage("Period is required."),
  validateRequest,
];

export const validateUpdateExperience = [
  body("position.tr").optional().notEmpty(),
  body("position.en").optional().notEmpty(),
  body("position.de").optional().notEmpty(),
  body("company.tr").optional().notEmpty(),
  body("company.en").optional().notEmpty(),
  body("company.de").optional().notEmpty(),
  body("period").optional().notEmpty(),
  validateRequest,
];

export const validateExperienceId = [
  param("id").isMongoId().withMessage("Experience ID must be a valid MongoDB ObjectId."),
  validateRequest,
];
