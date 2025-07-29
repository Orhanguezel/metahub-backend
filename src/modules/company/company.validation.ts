// src/modules/company/company.validation.ts

import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// --- Çoklu dil validasyon mesajı helper ---
function getValidationMessage(key: string, req: any) {
  const locale = req.locale || "en";
  return translations[key]?.[locale] || translations[key]?.en || key;
}

// --- ObjectId Validator (Tüm modüller için kullanılabilir) ---
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) => {
      const t = (key: string) =>
        translate(key, req.locale || getLogLocale(), translations);
      return t("validation.invalidObjectId");
    }),
  validateRequest,
];

// --- CREATE COMPANY VALIDATION ---
export const validateCreateCompany = [
  validateMultilangField("companyName").withMessage((_, { req }) => getValidationMessage("companyName.required", req)),
  validateMultilangField("companyDesc").optional(),

  body("email").isEmail().withMessage((_, { req }) => getValidationMessage("email.invalid", req)),
  body("phone").notEmpty().withMessage((_, { req }) => getValidationMessage("phone.required", req)),
  body("taxNumber").notEmpty().withMessage((_, { req }) => getValidationMessage("taxNumber.required", req)),
  body("handelsregisterNumber").optional().isString().withMessage((_, { req }) => getValidationMessage("handelsregisterNumber.invalid", req)),
  body("registerCourt").optional().isString().withMessage((_, { req }) => getValidationMessage("registerCourt.invalid", req)),
  body("website").optional().isString().withMessage((_, { req }) => getValidationMessage("website.invalid", req)),

  // Banka (dot notation ile parseNestedFields sonrası kontrol edilir)
  body("bankDetails.bankName").notEmpty().withMessage((_, { req }) => getValidationMessage("bankDetails.bankName.required", req)),
  body("bankDetails.iban").notEmpty().withMessage((_, { req }) => getValidationMessage("bankDetails.iban.required", req)),
  body("bankDetails.swiftCode").notEmpty().withMessage((_, { req }) => getValidationMessage("bankDetails.swiftCode.required", req)),

  // Yöneticiler: array veya string olarak kabul et (her iki form-data/JSON için)
  body("managers")
    .optional()
    .custom((value) => Array.isArray(value) || typeof value === "string")
    .withMessage((_, { req }) => getValidationMessage("managers.invalid", req)),
  body("managers.*")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("managers.invalidString", req)),

  // Sosyal linkler opsiyonel
  body("socialLinks.facebook").optional().isString().withMessage((_, { req }) => getValidationMessage("socialLinks.facebook.invalid", req)),
  body("socialLinks.instagram").optional().isString().withMessage((_, { req }) => getValidationMessage("socialLinks.instagram.invalid", req)),
  body("socialLinks.twitter").optional().isString().withMessage((_, { req }) => getValidationMessage("socialLinks.twitter.invalid", req)),
  body("socialLinks.linkedin").optional().isString().withMessage((_, { req }) => getValidationMessage("socialLinks.linkedin.invalid", req)),
  body("socialLinks.youtube").optional().isString().withMessage((_, { req }) => getValidationMessage("socialLinks.youtube.invalid", req)),

  validateRequest,
];

// --- UPDATE COMPANY VALIDATION ---
export const validateUpdateCompany = [
  validateMultilangField("companyName").optional().withMessage((_, { req }) => getValidationMessage("companyName.invalid", req)),
  validateMultilangField("companyDesc").optional(),

  body("email").optional().isEmail().withMessage((_, { req }) => getValidationMessage("email.invalid", req)),
  body("phone").optional().isString().withMessage((_, { req }) => getValidationMessage("phone.invalid", req)),
  body("taxNumber").optional().isString().withMessage((_, { req }) => getValidationMessage("taxNumber.invalid", req)),
  body("handelsregisterNumber").optional().isString().withMessage((_, { req }) => getValidationMessage("handelsregisterNumber.invalid", req)),
  body("registerCourt").optional().isString().withMessage((_, { req }) => getValidationMessage("registerCourt.invalid", req)),
  body("website").optional().isString().withMessage((_, { req }) => getValidationMessage("website.invalid", req)),

  // Adres alanı opsiyonel
  body("address.street").optional().isString().withMessage((_, { req }) => getValidationMessage("address.street.invalid", req)),
  body("address.city").optional().isString().withMessage((_, { req }) => getValidationMessage("address.city.invalid", req)),
  body("address.postalCode").optional().isString().withMessage((_, { req }) => getValidationMessage("address.postalCode.invalid", req)),
  body("address.country").optional().isString().withMessage((_, { req }) => getValidationMessage("address.country.invalid", req)),

  // Banka
  body("bankDetails.bankName").optional().isString().withMessage((_, { req }) => getValidationMessage("bankDetails.bankName.invalid", req)),
  body("bankDetails.iban").optional().isString().withMessage((_, { req }) => getValidationMessage("bankDetails.iban.invalid", req)),
  body("bankDetails.swiftCode").optional().isString().withMessage((_, { req }) => getValidationMessage("bankDetails.swiftCode.invalid", req)),

  // Yöneticiler: array veya string olarak kabul et (her iki form-data/JSON için)
  body("managers")
    .optional()
    .custom((value) => Array.isArray(value) || typeof value === "string")
    .withMessage((_, { req }) => getValidationMessage("managers.invalid", req)),
  body("managers.*")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("managers.invalidString", req)),

  // Sosyal linkler opsiyonel
  body("socialLinks.facebook").optional().isString().withMessage((_, { req }) => getValidationMessage("socialLinks.facebook.invalid", req)),
  body("socialLinks.instagram").optional().isString().withMessage((_, { req }) => getValidationMessage("socialLinks.instagram.invalid", req)),
  body("socialLinks.twitter").optional().isString().withMessage((_, { req }) => getValidationMessage("socialLinks.twitter.invalid", req)),
  body("socialLinks.linkedin").optional().isString().withMessage((_, { req }) => getValidationMessage("socialLinks.linkedin.invalid", req)),
  body("socialLinks.youtube").optional().isString().withMessage((_, { req }) => getValidationMessage("socialLinks.youtube.invalid", req)),

  validateRequest,
];
