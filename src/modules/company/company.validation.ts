import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Company create validation
export const validateCreateCompany = [
  body("companyName").notEmpty().withMessage("Company name is required."),
  body("taxNumber").notEmpty().withMessage("Tax number is required."),
  body("email").isEmail().withMessage("Valid email is required."),
  body("phone").notEmpty().withMessage("Phone is required."),
  body("address.street").notEmpty().withMessage("Street is required."),
  body("address.city").notEmpty().withMessage("City is required."),
  body("address.postalCode").notEmpty().withMessage("Postal code is required."),
  body("address.country").notEmpty().withMessage("Country is required."),
  body("bankDetails.bankName").notEmpty().withMessage("Bank name is required."),
  body("bankDetails.iban").notEmpty().withMessage("IBAN is required."),
  body("bankDetails.swiftCode").notEmpty().withMessage("SWIFT code is required."),
  validateRequest,
];

// ✅ Company update validation
export const validateUpdateCompany = [
  body("companyName").optional().isString(),
  body("taxNumber").optional().isString(),
  body("email").optional().isEmail(),
  body("phone").optional().isString(),
  validateRequest,
];

// ✅ ID validation
export const validateCompanyId = [
  param("id").isMongoId().withMessage("Company ID must be a valid MongoDB ObjectId."),
  validateRequest,
];
