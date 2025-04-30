import { body } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateCreateApikey = [
  body("name").isString().withMessage("Name is required."),
  validateRequest,
];
