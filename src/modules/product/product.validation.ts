// src/modules/product/product.validation.ts
import { body } from "express-validator";

// Create Product Validation
export const createProductValidator = [
  body("name.tr")
    .notEmpty()
    .withMessage("Product name (TR) is required."),
  body("name.en")
    .notEmpty()
    .withMessage("Product name (EN) is required."),
  body("name.de")
    .notEmpty()
    .withMessage("Product name (DE) is required."),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number."),
  body("category")
    .notEmpty()
    .withMessage("Category is required."),
  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer."),
];

// Update Product Validation
export const updateProductValidator = [
  body("name.tr")
    .optional()
    .notEmpty()
    .withMessage("Product name (TR) cannot be empty if provided."),
  body("name.en")
    .optional()
    .notEmpty()
    .withMessage("Product name (EN) cannot be empty if provided."),
  body("name.de")
    .optional()
    .notEmpty()
    .withMessage("Product name (DE) cannot be empty if provided."),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number."),
  body("category")
    .optional()
    .notEmpty()
    .withMessage("Category cannot be empty."),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer."),
];


