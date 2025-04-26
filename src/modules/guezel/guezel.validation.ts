import { body } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateCreateGuezel = [
  body("name").isString().withMessage("Name is required."),
  validateRequest,
];