// src/modules/custompizza/custompizza.validation.ts
import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create Custom Pizza Validation
export const createCustomPizzaValidator = [
  body("size").notEmpty().isIn(["klein", "mittel", "groß"]).withMessage("Size is required and must be klein, mittel, or groß."),
  body("base.tr").notEmpty().withMessage("Base (TR) is required."),
  body("base.en").notEmpty().withMessage("Base (EN) is required."),
  body("base.de").notEmpty().withMessage("Base (DE) is required."),
  body("sauce.tr").notEmpty().withMessage("Sauce (TR) is required."),
  body("sauce.en").notEmpty().withMessage("Sauce (EN) is required."),
  body("sauce.de").notEmpty().withMessage("Sauce (DE) is required."),
  body("toppings").isArray({ min: 1 }).withMessage("At least one topping is required."),
  body("totalPrice").isNumeric().withMessage("Total price must be a number."),
  validateRequest,
];

// ✅ ID Param Validation
export const validatePizzaIdParam = [
  param("id").isMongoId().withMessage("Invalid pizza ID."),
  validateRequest,
];
