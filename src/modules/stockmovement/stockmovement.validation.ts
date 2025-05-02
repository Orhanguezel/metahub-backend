import { body, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🎯 Create stock movement validation
export const validateCreateStockMovement = [
  body("product")
    .notEmpty().withMessage("Product ID is required.")
    .isMongoId().withMessage("Product must be a valid Mongo ID."),

  body("type")
    .notEmpty().withMessage("Movement type is required.")
    .isIn(["increase", "decrease", "adjust", "order", "return", "manual"])
    .withMessage("Invalid movement type."),

  body("quantity")
    .notEmpty().withMessage("Quantity is required.")
    .isNumeric().withMessage("Quantity must be a number."),

  // Optional multilingual note
  body("note")
    .optional()
    .custom((val) => {
      if (typeof val !== "object") {
        throw new Error("Note must be an object with multilingual fields.");
      }
      return true;
    }),

  validateRequest,
];

// 🎯 Optional query validation for listing
export const validateGetStockMovements = [
  query("product")
    .optional()
    .isMongoId().withMessage("Product must be a valid Mongo ID."),

  validateRequest,
];
