import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ➕ Create Customer
export const createCustomerValidator = [
  body("companyName").notEmpty().withMessage("Company name is required."),
  body("contactName").notEmpty().withMessage("Contact name is required."),
  body("email").isEmail().withMessage("A valid email is required."),
  body("phone").notEmpty().withMessage("Phone is required."),
  body("address.street").notEmpty().withMessage("Street is required."),
  body("address.city").notEmpty().withMessage("City is required."),
  body("address.postalCode").notEmpty().withMessage("Postal code is required."),
  body("address.country").notEmpty().withMessage("Country is required."),
  validateRequest,
];

// ✏️ Update Customer
export const updateCustomerValidator = [
  body("companyName").optional().isString(),
  body("contactName").optional().isString(),
  body("email").optional().isEmail(),
  body("phone").optional().isString(),
  body("address.street").optional().isString(),
  body("address.city").optional().isString(),
  body("address.postalCode").optional().isString(),
  body("address.country").optional().isString(),
  validateRequest,
];

// 🔍 Validate ID
export const validateCustomerIdParam = [
  param("id").isMongoId().withMessage("Invalid customer ID."),
  validateRequest,
];
