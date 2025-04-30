import { body } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateCreateDemo = [
  body("name").isString().notEmpty().withMessage("Name is required."),
  validateRequest,
];
