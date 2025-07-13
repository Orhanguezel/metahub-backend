import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { isValidObjectId } from "@/core/utils/validation";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// ✅ Gallery Upload Validation
export const validateUploadGallery = [
  body("category").isString().notEmpty().withMessage("Category is required."),

  // Type validation for gallery item
  body("type").optional().isIn(["image", "video"]).withMessage("Invalid type."),

  // Dynamic validation for name in all supported languages
  ...SUPPORTED_LOCALES.map((lang) =>
    body(`name_${lang}`)
      .optional()
      .custom((v) => Array.isArray(v) || typeof v === "string")
      .withMessage((_, { req }) =>
        translate(
          `validation.name_${lang}`,
          req.locale || getLogLocale(),
          translations
        )
      )
  ),

  // Dynamic validation for description in all supported languages
  ...SUPPORTED_LOCALES.map((lang) =>
    body(`desc_${lang}`)
      .optional()
      .custom((v) => Array.isArray(v) || typeof v === "string")
      .withMessage((_, { req }) =>
        translate(
          `validation.desc_${lang}`,
          req.locale || getLogLocale(),
          translations
        )
      )
  ),

  // Order validation for gallery item
  body("order")
    .optional()
    .custom((v) => {
      if (Array.isArray(v)) return v.every((el) => !isNaN(Number(el)));
      return !isNaN(Number(v));
    })
    .withMessage("Order must be a number or array of numbers."),

  validateRequest,
];

// ✅ Gallery Item ID Param Validation
export const validateGalleryIdParam = [
  param("id")
    .custom((value) => isValidObjectId(value))
    .withMessage("Invalid gallery ID."),
  validateRequest,
];

// ✅ Admin Query Validation (For filters like language, category, etc.)
export const validateAdminQuery = [
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidLanguage",
        req.locale || getLogLocale(),
        translations
      )
    ),
  query("category")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidCategory",
        req.locale || getLogLocale(),
        translations
      )
    ),
  query("isPublished")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate(
        "validation.booleanField",
        req.locale || getLogLocale(),
        translations
      )
    ),
  query("isActive")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate(
        "validation.booleanField",
        req.locale || getLogLocale(),
        translations
      )
    ),
  validateRequest,
];

// ✅ JSON Parse Helper for titles and descriptions
function parseIfJson(value: any) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}
