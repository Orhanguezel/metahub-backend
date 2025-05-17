import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateCreateCompany = [
  body("companyName").notEmpty(),
  body("taxNumber").notEmpty(),
  body("email").isEmail(),
  body("phone").notEmpty(),
  body("address.street").notEmpty(),
  body("address.city").notEmpty(),
  body("address.postalCode").notEmpty(),
  body("address.country").notEmpty(),
  body("bankDetails.bankName").notEmpty(),
  body("bankDetails.iban").notEmpty(),
  body("bankDetails.swiftCode").notEmpty(),
  body("socialLinks.facebook").optional().isString(),
  body("socialLinks.instagram").optional().isString(),
  body("socialLinks.twitter").optional().isString(),
  body("socialLinks.linkedin").optional().isString(),
  body("socialLinks.youtube").optional().isString(),
  validateRequest,
];

export const validateUpdateCompany = [
  body("companyName").optional().isString(),
  body("taxNumber").optional().isString(),
  body("email").optional().isEmail(),
  body("phone").optional().isString(),
  body("address.street").optional().isString(),
  body("address.city").optional().isString(),
  body("address.postalCode").optional().isString(),
  body("address.country").optional().isString(),
  body("bankDetails.bankName").optional().isString(),
  body("bankDetails.iban").optional().isString(),
  body("bankDetails.swiftCode").optional().isString(),
  body("socialLinks.facebook").optional().isString(),
  body("socialLinks.instagram").optional().isString(),
  body("socialLinks.twitter").optional().isString(),
  body("socialLinks.linkedin").optional().isString(),
  body("socialLinks.youtube").optional().isString(),
  validateRequest,
];

export const validateCompanyId = [
  param("id").isMongoId().withMessage("Company ID must be valid MongoDB ObjectId."),
  validateRequest,
];
