import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";

/* ---- helpers ---- */
const LOCALES: ReadonlyArray<SupportedLocale> = SUPPORTED_LOCALES;

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

const isI18nObject = (value: any) => {
  const obj = parseIfJson(value);
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  return LOCALES.some((k) => typeof obj[k] === "string" && String(obj[k]).trim().length > 0);
};

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// slug locale-aware string olabilir; doğrulamayı gevşek tutuyoruz
export const validateSlugParamOptionalI18n = [
  param("slug").isString().notEmpty(),
  query("lang").optional().isIn(LOCALES as unknown as string[]), // readonly güvenli
  validateRequest,
];

/* ---- Create ---- */
export const validateCreateCategory = [
  body("name").custom(isI18nObject)
    .withMessage("name must include at least one locale with non-empty string."),
  body("slug").optional({ checkFalsy: true }).custom((v) => {
    const obj = parseIfJson(v);
    if (typeof obj === "string") return true;              // tek locale string kabul
    if (obj && typeof obj === "object") return true;       // i18n obje kabul
    return false;
  }),
  body("description").optional({ checkFalsy: true }).custom(isI18nObject),
  body("seoTitle").optional({ checkFalsy: true }).custom(isI18nObject),
  body("seoDescription").optional({ checkFalsy: true }).custom(isI18nObject),
  body("parentId").optional({ checkFalsy: true }).isMongoId().withMessage("parentId must be a valid ObjectId."),
  body("image").optional().isString(),
  body("icon").optional().isString(),
  body("banner").optional().isString(),
  body("order").optional({ checkFalsy: true }).isInt(),
  body("status").optional({ checkFalsy: true }).isIn(["active", "draft", "hidden"]),
  validateRequest,
];

/* ---- Update ---- */
export const validateUpdateCategory = [
  body("name").optional({ checkFalsy: true }).custom(isI18nObject),
  body("slug").optional({ checkFalsy: true }).custom((v) => {
    const obj = parseIfJson(v);
    if (typeof obj === "string") return true;
    if (obj && typeof obj === "object") return true;
    return false;
  }),
  body("description").optional({ checkFalsy: true }).custom(isI18nObject),
  body("seoTitle").optional({ checkFalsy: true }).custom(isI18nObject),
  body("seoDescription").optional({ checkFalsy: true }).custom(isI18nObject),
  body("parentId").optional({ checkFalsy: true }).isMongoId(),
  body("image").optional().isString(),
  body("icon").optional().isString(),
  body("banner").optional().isString(),
  body("order").optional({ checkFalsy: true }).isInt(),
  body("status").optional({ checkFalsy: true }).isIn(["active", "draft", "hidden"]),
  body("removedImages").optional({ checkFalsy: true }).custom((v) => {
    if (Array.isArray(v)) return true;
    if (typeof v === "string") { try { return Array.isArray(JSON.parse(v)); } catch { return false; } }
    return false;
  }),
  validateRequest,
];

/* ---- Public list ---- */
export const validatePublicQuery = [
  query("view").optional().isIn(["shopo", "full", "raw"]),
  validateRequest,
];

/* ---- Admin list ---- */
export const validateAdminListQuery = [
  query("status").optional().isIn(["active", "draft", "hidden"]),
  query("parentId").optional().isString(),
  validateRequest,
];
