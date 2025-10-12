import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// JSON Parse Helper
function parseIfJson(value: any) {
  try { return typeof value === "string" ? JSON.parse(value) : value; }
  catch { return value; }
}

/* ===== Common ===== */
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

/* ===== Create ===== */
export const validateCreateCoupon = [
  // Multilang zorunlu alanlar
  validateMultilangField("title"),
  validateMultilangField("description"),

  body("code")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.requiredField", req.locale || getLogLocale(), translations, { field: "code" })
    )
    .isString()
    .withMessage((_, { req }) =>
      translate("validation.invalidField", req.locale || getLogLocale(), translations, { field: "code" })
    ),

  body("discount")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.requiredField", req.locale || getLogLocale(), translations, { field: "discount" })
    )
    .isNumeric()
    .withMessage((_, { req }) =>
      translate("validation.invalidDiscount", req.locale || getLogLocale(), translations)
    )
    .isInt({ min: 1, max: 100 })
    .withMessage((_, { req }) =>
      translate("validation.discountRange", req.locale || getLogLocale(), translations)
    ),

  body("expiresAt")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.requiredField", req.locale || getLogLocale(), translations, { field: "expiresAt" })
    )
    .isISO8601()
    .withMessage((_, { req }) =>
      translate("validation.invalidDate", req.locale || getLogLocale(), translations)
    ),

  body("isPublished").optional().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  body("isActive").optional().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),

  validateRequest,
];

/* ===== Update ===== */
export const validateUpdateCoupon = [
  body("title").optional().customSanitizer(parseIfJson),
  body("description").optional().customSanitizer(parseIfJson),

  body("discount")
    .optional()
    .isNumeric()
    .withMessage((_, { req }) =>
      translate("validation.invalidDiscount", req.locale || getLogLocale(), translations)
    )
    .isInt({ min: 1, max: 100 })
    .withMessage((_, { req }) =>
      translate("validation.discountRange", req.locale || getLogLocale(), translations)
    ),

  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage((_, { req }) =>
      translate("validation.invalidDate", req.locale || getLogLocale(), translations)
    ),

  body("isActive").optional().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  body("isPublished").optional().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),

  body("removedImages")
    .optional()
    .custom((val, { req }) => {
      try {
        const parsed = typeof val === "string" ? JSON.parse(val) : val;
        if (!Array.isArray(parsed)) throw new Error();
        return true;
      } catch {
        const msg = translate("validation.invalidRemovedImages", req.locale || getLogLocale(), translations);
        logger.withReq.warn(req as any, msg, { ...getRequestContext(req), value: val, path: "removedImages" });
        throw new Error(msg);
      }
    }),

  validateRequest,
];

/* ===== Admin Query ===== */
export const validateAdminQuery = [
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage((_, { req }) =>
      translate("validation.invalidLanguage", req.locale || getLogLocale(), translations)
    ),

  query("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  query("isPublished").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),

  query("discount")
    .optional()
    .isNumeric()
    .withMessage((_, { req }) =>
      translate("validation.invalidDiscount", req.locale || getLogLocale(), translations)
    )
    .isInt({ min: 1, max: 100 })
    .withMessage((_, { req }) =>
      translate("validation.discountRange", req.locale || getLogLocale(), translations)
    ),

  validateRequest,
];
