import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// ✅ JSON Parse Helper
function parseIfJson(value: any) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}


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

// --- CREATE Validation (Gallery) ---
export const validateUploadGallery = [
  // Çok dilli zorunlu alan: name
  validateMultilangField("name"),

  // Çok dilli opsiyonel alan: description
  body("description").optional().customSanitizer(parseIfJson),

  // Diğer zorunlu ve opsiyonel alanlar
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
  body("type")
    .optional()
    .isIn(["image", "video"])
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidType",
        req.locale || getLogLocale(),
        translations
      )
    ),
  body("order")
    .optional()
    .custom((v) => !isNaN(Number(v)))
    .withMessage("Order must be a number."),

  validateRequest,
];

// --- UPDATE Validation (Gallery) ---
export const validateUpdateGallery = [
  // Çok dilli opsiyonel alanlar
  body("name").optional().customSanitizer(parseIfJson),
  body("description").optional().customSanitizer(parseIfJson),

  body("category").optional(),
  body("type").optional(),
  body("order")
    .optional()
    .custom((v) => !isNaN(Number(v)))
    .withMessage("Order must be a number."),
  body("isPublished").optional().toBoolean(),
  body("isActive").optional().toBoolean(),
  body("priority").optional().custom((v) => !isNaN(Number(v))),
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
        logger.withReq.warn(req as any, t("validation.invalidRemovedImages"), {
          ...getRequestContext(req),
          value: val,
          path: "removedImages",
        });
        throw new Error(t("validation.invalidRemovedImages"));
      }
    }),

  validateRequest,
];

// --- Param Validation (ObjectId için) ---
export const validateGalleryIdParam = [
  param("id")
    .isMongoId()
    .withMessage((_, { req }) => {
      const t = (key: string) =>
        translate(key, req.locale || getLogLocale(), translations);
      return t("validation.invalidObjectId");
    }),
  validateRequest,
];

// --- Query Validation (Admin filtreleme vs.) ---
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

