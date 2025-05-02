import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Add to favorites validation
export const addFavoriteValidator = [
  body("productId").notEmpty().isMongoId().withMessage("Product ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

// ✅ Remove favorite validation
export const removeFavoriteValidator = [
  param("productId").notEmpty().isMongoId().withMessage("Product ID must be a valid MongoDB ObjectId."),
  validateRequest,
];
