import { body, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

/** Her iki sözlüğü de kabul et: kanonik + legacy */
const allowedTypes = [
  "in", "out", "reserve", "release", "return", "adjust",
  "increase", "decrease", "order", "manual",
] as const;

export const validateCreateStockledger = [
  body("product")
    .notEmpty().withMessage("Product ID is required.")
    .isMongoId().withMessage("Product must be a valid Mongo ID."),

  body("type")
    .notEmpty().withMessage("Movement type is required.")
    .isIn(allowedTypes as unknown as string[])
    .withMessage("Invalid movement type."),

  body("quantity")
    .notEmpty().withMessage("Quantity is required.")
    .isNumeric().withMessage("Quantity must be a number."),

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

export const validateGetStockledgers = [
  query("product").optional().isMongoId().withMessage("Product must be a valid Mongo ID."),
  query("type").optional().isIn(allowedTypes as unknown as string[]).withMessage("Invalid movement type."),
  validateRequest,
];
