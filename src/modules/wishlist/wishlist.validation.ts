import { param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ productId parametre doğrulaması
export const validateProductIdParam = [
  param("productId")
    .notEmpty().withMessage("Product ID is required.")
    .isMongoId().withMessage("Invalid product ID."),
  validateRequest,
];
