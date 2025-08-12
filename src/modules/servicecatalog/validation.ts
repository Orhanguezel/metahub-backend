// src/modules/servicecatalog/validation.ts
import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// ---- helpers ----
const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

function parseIfJson(value: any) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}

// ✅ ObjectId Validator (ortak)
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

// ✅ Create Validator (admin POST /servicecatalog)
export const validateCreateServiceCatalog = [
  // code opsiyonel: varsa normalize + pattern kontrol
  body("code")
    .optional()
    .customSanitizer(toUpperSnake)
    .matches(/^[A-Z0-9_]+$/)
    .withMessage((_, { req }) =>
      translate("validation.invalidCode", req.locale || getLogLocale(), translations)
    ),

  // i18n zorunlu alan: name
  validateMultilangField("name"),

  // i18n opsiyonel alan: description
  body("description").optional().customSanitizer(parseIfJson),

  // zorunlu sayısal alanlar
  body("defaultDurationMin")
    .exists()
    .isInt({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.defaultDurationMinPositive", req.locale || getLogLocale(), translations)
    ),
  body("defaultTeamSize")
    .exists()
    .isInt({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.defaultTeamSizePositive", req.locale || getLogLocale(), translations)
    ),

  // opsiyonel sayısal
  body("suggestedPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.suggestedPricePositive", req.locale || getLogLocale(), translations)
    ),

  // ilişkiler
  body("category")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
    ),

  // diziler
  body("tags")
    .optional()
    .isArray()
    .withMessage((_, { req }) =>
      translate("validation.tagsArray", req.locale || getLogLocale(), translations)
    ),

  validateRequest,
];

// ✅ Update Validator (admin PUT /servicecatalog/:id)
export const validateUpdateServiceCatalog = [
  body("code")
    .optional()
    .customSanitizer(toUpperSnake)
    .matches(/^[A-Z0-9_]+$/)
    .withMessage((_, { req }) =>
      translate("validation.invalidCode", req.locale || getLogLocale(), translations)
    ),

  // i18n alanları merge edilecek → sadece sanitize
  body("name").optional().customSanitizer(parseIfJson),
  body("description").optional().customSanitizer(parseIfJson),

  // sayısallar
  body("defaultDurationMin")
    .optional()
    .isInt({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.defaultDurationMinPositive", req.locale || getLogLocale(), translations)
    ),
  body("defaultTeamSize")
    .optional()
    .isInt({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.defaultTeamSizePositive", req.locale || getLogLocale(), translations)
    ),
  body("suggestedPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.suggestedPricePositive", req.locale || getLogLocale(), translations)
    ),

  // ilişkiler
  body("category")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
    ),

  // tags
  body("tags")
    .optional()
    .custom((val, { req }) => {
      const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
      try {
        const parsed = parseIfJson(val);
        if (Array.isArray(parsed)) return true;
        throw new Error();
      } catch {
        throw new Error(t("validation.tagsArray"));
      }
    }),

  // removedImages: JSON array of { url, publicId? }
  body("removedImages")
    .optional()
    .custom((val, { req }) => {
      const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
      try {
        const parsed = typeof val === "string" ? JSON.parse(val) : val;
        if (!Array.isArray(parsed)) throw new Error();
        // her elemanda url bekleriz (opsiyonel publicId)
        const ok = parsed.every((x: any) => x && typeof x.url === "string");
        if (!ok) throw new Error();
        return true;
      } catch {
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

// ✅ Admin Query Validator (GET /servicecatalog)
export const validateServiceCatalogAdminQuery = [
  query("q").optional().isString().trim(),
  query("code")
    .optional()
    .trim()
    .customSanitizer(toUpperSnake)
    .matches(/^[A-Z0-9_]+$/)
    .withMessage((_, { req }) =>
      translate("validation.invalidCode", req.locale || getLogLocale(), translations)
    ),
  query("category")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
    ),
  query("isActive")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate("validation.booleanField", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];
