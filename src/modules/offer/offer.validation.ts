import { param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ ID doğrulama
export const idParamValidator = [
  param("id").isMongoId().withMessage("Invalid offer ID."),
  validateRequest,
];
