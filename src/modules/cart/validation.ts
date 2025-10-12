import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

const PRODUCT_TYPES = ["product", "ensotekprod", "sparepart", "menuitem"] as const;

export const addToCartValidator = [
  body("productId").notEmpty().isMongoId().withMessage("Product ID must be a valid MongoDB ObjectId."),
  body("productType").notEmpty().isIn(PRODUCT_TYPES as any).withMessage("Product type is invalid."),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1."),
  body().custom((val) => {
    if (val?.productType !== "menuitem") return true;
    const m = val?.menu;
    if (!m || typeof m !== "object") throw new Error("Menu selection must be an object.");
    if (m.variantCode != null && typeof m.variantCode !== "string") throw new Error("variantCode must be a string.");
    if (m.depositIncluded != null && typeof m.depositIncluded !== "boolean") {
      throw new Error("depositIncluded must be a boolean.");
    }
    if (m.notes != null && typeof m.notes !== "string") throw new Error("notes must be a string.");
    if (m.modifiers != null) {
      if (!Array.isArray(m.modifiers)) throw new Error("modifiers must be an array.");
      for (const sel of m.modifiers) {
        if (!sel || typeof sel !== "object") throw new Error("modifier must be an object.");
        if (!sel.groupCode || !sel.optionCode) throw new Error("modifier needs groupCode & optionCode.");
        if (sel.quantity != null && (!Number.isInteger(sel.quantity) || sel.quantity < 1))
          throw new Error("modifier.quantity must be >= 1 when provided.");
      }
    }
    return true;
  }),
  validateRequest,
];

export const cartItemBodyValidator = [
  body("productId").notEmpty().isMongoId().withMessage("Product ID must be a valid MongoDB ObjectId."),
  body("productType").notEmpty().isIn(PRODUCT_TYPES as any).withMessage("Product type is invalid."),
  validateRequest,
];

export const cartItemParamValidator = [
  param("productId").notEmpty().isMongoId().withMessage("Product ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

export const cartIdParamValidator = [
  param("id").notEmpty().isMongoId().withMessage("Cart ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

export const updateCartValidator = [
  body("items").optional().isArray().withMessage("Items must be an array."),
  body("items.*.product").optional().isMongoId().withMessage("Each item must have a valid product ID."),
  body("items.*.productType").optional().isIn(PRODUCT_TYPES as any).withMessage("Each item must have a valid product type."),
  body("items.*.quantity").optional().isInt({ min: 1 }).withMessage("Each item quantity must be at least 1."),
  validateRequest,
];

/* ========== MENU CART LINE ========== */

export const cartLineCreateValidator = [
  body("menuItemId").notEmpty().isMongoId().withMessage("menuItemId must be a valid MongoDB ObjectId."),
  body("quantity").optional().isInt({ min: 1, max: 50 }).withMessage("quantity must be 1..50."),
  body("variantCode").optional().isString().withMessage("variantCode must be string."),
  body("depositIncluded").optional().isBoolean().withMessage("depositIncluded must be boolean."),
  body("notes").optional().isString().withMessage("notes must be string."),
  body("currency").optional().isString().isLength({ min: 3, max: 3 }).withMessage("currency must be ISO 4217."),
  body("modifiers").optional().isArray().withMessage("modifiers must be an array."),
  body("modifiers.*.groupCode").optional().isString().notEmpty().withMessage("modifiers[*].groupCode required."),
  body("modifiers.*.optionCode").optional().isString().notEmpty().withMessage("modifiers[*].optionCode required."),
  body("modifiers.*.quantity").optional().isInt({ min: 1 }).withMessage("modifiers[*].quantity must be >= 1."),
];

export const cartLineUpdateValidator = [
  body("quantity").optional().isInt({ min: 1, max: 50 }).withMessage("quantity must be 1..50."),
  body("variantCode").optional().isString().withMessage("variantCode must be string."),
  body("depositIncluded").optional().isBoolean().withMessage("depositIncluded must be boolean."),
  body("notes").optional().isString().withMessage("notes must be string."),
  body("currency").optional().isString().isLength({ min: 3, max: 3 }).withMessage("currency must be ISO 4217."),
  body("modifiers").optional().isArray().withMessage("modifiers must be an array."),
  body("modifiers.*.groupCode").optional().isString().notEmpty().withMessage("modifiers[*].groupCode required."),
  body("modifiers.*.optionCode").optional().isString().notEmpty().withMessage("modifiers[*].optionCode required."),
  body("modifiers.*.quantity").optional().isInt({ min: 1 }).withMessage("modifiers[*].quantity must be >= 1."),
];

export const cartLineParamValidator = [
  param("lineId").notEmpty().isMongoId().withMessage("lineId must be a valid MongoDB ObjectId."),
];

export const cartPricingValidator = [
  body("tipAmount").optional().isFloat({ min: 0 }).withMessage("tipAmount must be >= 0."),
  body("deliveryFee").optional().isFloat({ min: 0 }).withMessage("deliveryFee must be >= 0."),
  body("serviceFee").optional().isFloat({ min: 0 }).withMessage("serviceFee must be >= 0."),
  body("couponCode").optional().isString().withMessage("couponCode must be string."),
  body("currency").optional().isString().isLength({ min: 3, max: 3 }).withMessage("currency must be ISO 4217."),
];
