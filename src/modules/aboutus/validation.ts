import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

/* helpers */
const parseJson = (v: any) => (typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return v; } })() : v);

const hasAtLeastOneLocaleObject = (value: any) => {
  const obj = parseJson(value);
  if (!obj || typeof obj !== "object") return false;
  return SUPPORTED_LOCALES.some((loc) => typeof obj[loc] === "string" && String(obj[loc]).trim());
};
const hasAtLeastOneLocaleStringArray = (value: any) => {
  const obj = parseJson(value);
  if (!obj || typeof obj !== "object") return false;
  return SUPPORTED_LOCALES.some((loc) => Array.isArray(obj[loc]) && obj[loc].length);
};

/* ObjectId */
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", (req as any).locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* Create */
export const validateCreateAboutus = [
  body("title").custom(hasAtLeastOneLocaleObject).withMessage((_, { req }) =>
    translate("validation.titleRequired", (req as any).locale || getLogLocale(), translations)
  ),
  body("summary").optional({ checkFalsy: true }).custom(hasAtLeastOneLocaleObject),
  body("content").optional({ checkFalsy: true }).custom(hasAtLeastOneLocaleObject),
  body("slug").optional({ checkFalsy: true }).custom(hasAtLeastOneLocaleObject),
  body("tags").optional({ checkFalsy: true }).custom(hasAtLeastOneLocaleStringArray),
  body("category").exists({ checkFalsy: true }).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidCategory", (req as any).locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* Update */
export const validateUpdateAboutus = [
  body("title").optional({ checkFalsy: true }).custom(hasAtLeastOneLocaleObject),
  body("summary").optional({ checkFalsy: true }).custom(hasAtLeastOneLocaleObject),
  body("content").optional({ checkFalsy: true }).custom(hasAtLeastOneLocaleObject),
  body("slug").optional({ checkFalsy: true }).custom(hasAtLeastOneLocaleObject),
  body("tags").optional({ checkFalsy: true }).custom(hasAtLeastOneLocaleStringArray),
  body("category").optional({ checkFalsy: true }).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidCategory", (req as any).locale || getLogLocale(), translations)
  ),
  body("removedImages").optional({ checkFalsy: true }).custom((val) => {
    try { const p = typeof val === "string" ? JSON.parse(val) : val; return Array.isArray(p); } catch { return false; }
  }).withMessage((_, { req }) =>
    translate("validation.invalidRemovedImages", (req as any).locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* Admin / Public Query */
export const validateAdminQuery = [
  query("language").optional().isIn(SUPPORTED_LOCALES),
  query("category").optional().isMongoId(),
  query("isPublished").optional().toBoolean().isBoolean(),
  query("isActive").optional().toBoolean().isBoolean(),
  query("q").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
];

export const validatePublicQuery = [
  query("category").optional().isMongoId(),
  query("onlyLocalized").optional().isIn(["true", "false"]),
  validateRequest,
];
