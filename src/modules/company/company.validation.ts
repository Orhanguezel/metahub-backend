// src/modules/company/company.validation.ts

import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import companyI18n from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";

// Çoklu dil validasyon mesajı helper
function getValidationMessage(key: string, req: any) {
  const locale = req.locale || "en";
  return companyI18n[key]?.[locale] || companyI18n[key]?.en || key;
}

// 🟢 Central ObjectId Validator (tüm modüller için kullanılabilir)
export const validateObjectId = (
  field: string,
  i18nKey = "validation.invalidObjectId"
) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) =>
      translate(i18nKey, req.locale || "en", translations)
    ),
  validateRequest,
];

// ✅ Create Company Validation (çoklu dil)
// Tüm alanlar zorunlu, sosyal linkler opsiyonel
export const validateCreateCompany = [
  body("companyName")
    .notEmpty()
    .withMessage((_, { req }) => getValidationMessage("companyName.required", req)),
  body("taxNumber")
    .notEmpty()
    .withMessage((_, { req }) => getValidationMessage("taxNumber.required", req)),
  body("email")
    .isEmail()
    .withMessage((_, { req }) => getValidationMessage("email.invalid", req)),
  body("phone")
    .notEmpty()
    .withMessage((_, { req }) => getValidationMessage("phone.required", req)),
  body("address.street")
    .notEmpty()
    .withMessage((_, { req }) => getValidationMessage("address.street.required", req)),
  body("address.city")
    .notEmpty()
    .withMessage((_, { req }) => getValidationMessage("address.city.required", req)),
  body("address.postalCode")
    .notEmpty()
    .withMessage((_, { req }) => getValidationMessage("address.postalCode.required", req)),
  body("address.country")
    .notEmpty()
    .withMessage((_, { req }) => getValidationMessage("address.country.required", req)),
  body("bankDetails.bankName")
    .notEmpty()
    .withMessage((_, { req }) => getValidationMessage("bankDetails.bankName.required", req)),
  body("bankDetails.iban")
    .notEmpty()
    .withMessage((_, { req }) => getValidationMessage("bankDetails.iban.required", req)),
  body("bankDetails.swiftCode")
    .notEmpty()
    .withMessage((_, { req }) => getValidationMessage("bankDetails.swiftCode.required", req)),
  // Sosyal linkler opsiyonel, tip kontrolü + çoklu dil ile
  body("socialLinks.facebook")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("socialLinks.facebook.invalid", req)),
  body("socialLinks.instagram")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("socialLinks.instagram.invalid", req)),
  body("socialLinks.twitter")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("socialLinks.twitter.invalid", req)),
  body("socialLinks.linkedin")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("socialLinks.linkedin.invalid", req)),
  body("socialLinks.youtube")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("socialLinks.youtube.invalid", req)),
  validateRequest,
];

// ✅ Update Company Validation (çoklu dil)
// Her alan opsiyonel, tip ve format kontrolleri + çoklu dil mesajı
export const validateUpdateCompany = [
  body("companyName")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("companyName.invalid", req)),
  body("taxNumber")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("taxNumber.invalid", req)),
  body("email")
    .optional()
    .isEmail()
    .withMessage((_, { req }) => getValidationMessage("email.invalid", req)),
  body("phone")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("phone.invalid", req)),
  body("address.street")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.street.invalid", req)),
  body("address.city")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.city.invalid", req)),
  body("address.postalCode")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.postalCode.invalid", req)),
  body("address.country")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.country.invalid", req)),
  body("bankDetails.bankName")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("bankDetails.bankName.invalid", req)),
  body("bankDetails.iban")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("bankDetails.iban.invalid", req)),
  body("bankDetails.swiftCode")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("bankDetails.swiftCode.invalid", req)),
  // Sosyal linkler yine opsiyonel
  body("socialLinks.facebook")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("socialLinks.facebook.invalid", req)),
  body("socialLinks.instagram")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("socialLinks.instagram.invalid", req)),
  body("socialLinks.twitter")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("socialLinks.twitter.invalid", req)),
  body("socialLinks.linkedin")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("socialLinks.linkedin.invalid", req)),
  body("socialLinks.youtube")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("socialLinks.youtube.invalid", req)),
  validateRequest,
];
