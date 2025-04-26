import { body } from "express-validator";

export const createCategoryValidator = [
  body("name").notEmpty().withMessage("Name is required."),
  body("label.tr").notEmpty().withMessage("Label (TR) is required."),
  body("label.en").notEmpty().withMessage("Label (EN) is required."),
  body("label.de").notEmpty().withMessage("Label (DE) is required."),
];

export const updateCategoryValidator = [
  body("name").optional().notEmpty().withMessage("Name cannot be empty."),
  body("label.tr").optional().notEmpty().withMessage("Label (TR) cannot be empty."),
  body("label.en").optional().notEmpty().withMessage("Label (EN) cannot be empty."),
  body("label.de").optional().notEmpty().withMessage("Label (DE) cannot be empty."),
];
