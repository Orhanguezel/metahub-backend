import { body } from "express-validator";

export const createOrderValidator = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Order must have at least one item."),
  body("items.*.product")
    .notEmpty()
    .withMessage("Each item must have a valid product ID."),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Each item must have a quantity of at least 1."),
  body("shippingAddress.name")
    .notEmpty()
    .withMessage("Shipping name is required."),
  body("shippingAddress.phone")
    .notEmpty()
    .withMessage("Shipping phone is required."),
  body("shippingAddress.email")
    .isEmail()
    .withMessage("Valid shipping email is required."),
  body("shippingAddress.street")
    .notEmpty()
    .withMessage("Shipping street is required."),
  body("shippingAddress.city")
    .notEmpty()
    .withMessage("Shipping city is required."),
  body("shippingAddress.postalCode")
    .notEmpty()
    .withMessage("Shipping postal code is required."),
  body("shippingAddress.country")
    .notEmpty()
    .withMessage("Shipping country is required."),
  body("totalPrice")
    .isFloat({ min: 0 })
    .withMessage("Total price must be a positive number."),
];

export const updateOrderStatusValidator = [
  body("status")
    .isIn(["pending", "preparing", "shipped", "completed", "cancelled"])
    .withMessage("Invalid order status."),
];

export const updateShippingAddressValidator = [
  body("shippingAddress.name")
    .optional()
    .notEmpty()
    .withMessage("Shipping name cannot be empty."),
  body("shippingAddress.phone")
    .optional()
    .notEmpty()
    .withMessage("Shipping phone cannot be empty."),
  body("shippingAddress.email")
    .optional()
    .isEmail()
    .withMessage("Valid shipping email is required."),
  body("shippingAddress.street")
    .optional()
    .notEmpty()
    .withMessage("Shipping street cannot be empty."),
  body("shippingAddress.city")
    .optional()
    .notEmpty()
    .withMessage("Shipping city cannot be empty."),
  body("shippingAddress.postalCode")
    .optional()
    .notEmpty()
    .withMessage("Shipping postal code cannot be empty."),
  body("shippingAddress.country")
    .optional()
    .notEmpty()
    .withMessage("Shipping country cannot be empty."),
];
