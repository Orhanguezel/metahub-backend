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

// ✅ Create Coupon Validator
export const validateCreateCoupon = [
  // Çok dilli zorunlu alan: title
  validateMultilangField("title"),

  // Çok dilli zorunlu alan: description
  validateMultilangField("description"),

  body("code")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate(
        "validation.requiredField",
        req.locale || getLogLocale(),
        translations
      )
    )
    .isString()
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidField",
        req.locale || getLogLocale(),
        translations
      )
    ),
  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate(
        "validation.booleanField",
        req.locale || getLogLocale(),
        translations
      )
    ),
  body("discount")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate(
        "validation.requiredField",
        req.locale || getLogLocale(),
        translations,
        { field: "discount" }
      )
    )
    .isNumeric()
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidDiscount",
        req.locale || getLogLocale(),
        translations
      )
    )
    .isInt({ min: 1, max: 100 })
    .withMessage((_, { req }) =>
      translate(
        "validation.discountRange",
        req.locale || getLogLocale(),
        translations
      )
    ),

  body("expiresAt")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate(
        "validation.requiredField",
        req.locale || getLogLocale(),
        translations,
        { field: "expiresAt" }
      )
    )
    .isISO8601()
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidDate",
        req.locale || getLogLocale(),
        translations
      )
    ),

  body("isActive")
    .optional()
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

// ✅ Update Coupon Validator
export const validateUpdateCoupon = [
  body("title").optional().customSanitizer(parseIfJson), // Çoklu dilde güncelleme için
  body("description").optional().customSanitizer(parseIfJson), // Çoklu dilde güncelleme için

  body("discount")
    .optional()
    .isNumeric()
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidDiscount",
        req.locale || getLogLocale(),
        translations
      )
    )
    .isInt({ min: 1, max: 100 })
    .withMessage((_, { req }) =>
      translate(
        "validation.discountRange",
        req.locale || getLogLocale(),
        translations
      )
    ),

  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidDate",
        req.locale || getLogLocale(),
        translations
      )
    ),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate(
        "validation.booleanField",
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

  query("discount")
    .optional()
    .isNumeric()
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidDiscount",
        req.locale || getLogLocale(),
        translations
      )
    )
    .isInt({ min: 1, max: 100 })
    .withMessage((_, { req }) =>
      translate(
        "validation.discountRange",
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
