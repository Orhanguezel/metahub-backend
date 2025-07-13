import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// ✅ ObjectId Validator
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

// ✅ Create Validator
export const validateCreateActivity = [
  // Çok dilli zorunlu alan: title
  validateMultilangField("title"),

  // Opsiyonel alanlar
  body("summary").optional().customSanitizer(parseIfJson),
  body("content").optional().customSanitizer(parseIfJson),
  body("tags")
    .optional()
    .isArray()
    .withMessage((_, { req }) =>
      translate(
        "validation.tagsArray",
        req.locale || getLogLocale(),
        translations
      )
    ),
  body("category")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidCategory",
        req.locale || getLogLocale(),
        translations
      )
    ),

  validateRequest,
];

// ✅ Update Validator
export const validateUpdateActivity = [
  body("title").optional().customSanitizer(parseIfJson),
  body("summary").optional().customSanitizer(parseIfJson),
  body("content").optional().customSanitizer(parseIfJson),
  body("tags")
    .optional()
    .isArray()
    .withMessage((_, { req }) =>
      translate(
        "validation.tagsArray",
        req.locale || getLogLocale(),
        translations
      )
    ),
  body("category")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidCategory",
        req.locale || getLogLocale(),
        translations
      )
    ),
  body("removedImages")
    .optional()
    .custom((val, { req }) => {
      try {
        const parsed = typeof val === "string" ? JSON.parse(val) : val;
        if (!Array.isArray(parsed)) throw new Error();
        return true;
      } catch {
        const t = (key: string) =>
          translate(key, req.locale || getLogLocale(), translations);
        logger.warn(t("validation.invalidRemovedImages"), {
          ...getRequestContext(req),
          value: val,
          path: "removedImages",
        });
        throw new Error(t("validation.invalidRemovedImages"));
      }
    }),

  validateRequest,
];

// ✅ Admin Query Validator
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

// ✅ JSON Parse Helper
function parseIfJson(value: any) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}
