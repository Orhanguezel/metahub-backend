import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const addToCartValidator = [
  body("productId")
    .notEmpty()
    .isMongoId()
    .withMessage("Product ID must be a valid MongoDB ObjectId."),
  body("productType")
    .notEmpty()
    .isIn(["bike", "ensotekprod", "sparepart"]) // Desteklediğin ürün tipleri burada güncel tutulmalı!
    .withMessage("Product type is invalid."),
  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1."),
  validateRequest,
];

export const cartItemBodyValidator = [
  body("productId")
    .notEmpty()
    .isMongoId()
    .withMessage("Product ID must be a valid MongoDB ObjectId."),
  body("productType")
    .notEmpty()
    .isIn(["bike", "ensotekprod", "sparepart"])
    .withMessage("Product type is invalid."),
  validateRequest,
];


export const cartItemParamValidator = [
  param("productId")
    .notEmpty()
    .isMongoId()
    .withMessage("Product ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

export const cartIdParamValidator = [
  param("id")
    .notEmpty()
    .isMongoId()
    .withMessage("Cart ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

export const updateCartValidator = [
  body("items").optional().isArray().withMessage("Items must be an array."),
  body("items.*.product")
    .optional()
    .isMongoId()
    .withMessage("Each item must have a valid product ID."),
  body("items.*.productType")
    .optional()
    .isIn(["bike", "ensotekprod", "sparepart"])
    .withMessage("Each item must have a valid product type."),
  body("items.*.quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each item quantity must be at least 1."),
  validateRequest,
];
