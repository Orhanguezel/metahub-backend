import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// Çok dilli features alanı validasyonu (array olacak!)
export const validateMultilangStringArrayField = (field: string) =>
  body(field)
    .optional()
    .custom((value, { req }) => {
      const obj = typeof value === "string" ? JSON.parse(value) : value;
      if (obj == null) return true; // opsiyonel olduğu için boş geçilebilir
      if (typeof obj !== "object") {
        throw new Error(`${field} must be an object`);
      }
      // Her dil için, varsa array/string olmalı
      for (const lang of SUPPORTED_LOCALES) {
        if (obj[lang] == null) continue;
        if (
          !Array.isArray(obj[lang]) ||
          !obj[lang].every((x: any) => typeof x === "string")
        ) {
          throw new Error(
            `Each value in ${field}.${lang} must be a string array`
          );
        }
      }
      return true;
    });

// ✅ ObjectId Validator
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

// --- Create Pricing ---
export const validateCreatePricing = [
  validateMultilangField("title"),
  body("description").optional().customSanitizer(parseIfJson),
  validateMultilangStringArrayField("features"),   // <---- ÖNEMLİ, EKLENDİ!
  body("category").optional().isString(),
  body("price")
    .exists().withMessage((_, { req }) => translate("validation.missingPrice", req.locale || getLogLocale(), translations))
    .isNumeric().withMessage((_, { req }) => translate("validation.invalidPrice", req.locale || getLogLocale(), translations)),
  body("currency")
    .exists().isIn(["USD", "EUR", "TRY"])
    .withMessage((_, { req }) => translate("validation.invalidCurrency", req.locale || getLogLocale(), translations)),
  body("period")
    .exists().isIn(["monthly", "yearly", "once"])
    .withMessage((_, { req }) => translate("validation.invalidPeriod", req.locale || getLogLocale(), translations)),
  body("isPopular").optional().isBoolean(),
  body("order").optional().isNumeric(),
  body("isActive").optional().isBoolean(),
  body("isPublished").optional().isBoolean(),
  body("publishedAt").optional().isISO8601(),
  validateRequest,
];

// --- Update Pricing ---
export const validateUpdatePricing = [
  body("title").optional().customSanitizer(parseIfJson),
  body("description").optional().customSanitizer(parseIfJson),
  validateMultilangStringArrayField("features"),   // <---- ÖNEMLİ, EKLENDİ!
  body("category").optional().isString(),
  body("price").optional().isNumeric(),
  body("currency").optional().isIn(["USD", "EUR", "TRY"]),
  body("period").optional().isIn(["monthly", "yearly", "once"]),
  body("isPopular").optional().isBoolean(),
  body("order").optional().isNumeric(),
  body("isActive").optional().isBoolean(),
  body("isPublished").optional().isBoolean(),
  body("publishedAt").optional().isISO8601(),
  validateRequest,
];

// --- Admin Query Validator ---
export const validateAdminQuery = [
  query("language").optional().isIn(SUPPORTED_LOCALES),
  query("isPublished").optional().toBoolean().isBoolean(),
  query("isActive").optional().toBoolean().isBoolean(),
  validateRequest,
];

// --- JSON Parse Helper ---
function parseIfJson(value: any) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}
