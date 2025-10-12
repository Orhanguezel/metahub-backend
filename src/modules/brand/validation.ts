import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";

const tByReq = (req: any, k: string) =>
  translate(k, req?.locale || getLogLocale(), translations);

// helpers
function parseIfJson(v: any) {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
}
const isI18nStringObj = (obj: any) =>
  obj && typeof obj === "object" && !Array.isArray(obj) &&
  Object.values(obj).some((v) => typeof v === "string" && v.trim());

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// slug validator: i18n object OR single string
function validateSlugFlexible(v: any, { req }: any) {
  const pv = parseIfJson(v);
  if (pv == null || pv === "") return true; // optional
  if (typeof pv === "string") {
    if (!slugRegex.test(pv)) throw new Error(tByReq(req, "validation.slugInvalid"));
    return true;
  }
  if (isI18nStringObj(pv)) {
    for (const k of Object.keys(pv)) {
      if (!SUPPORTED_LOCALES.includes(k as SupportedLocale)) continue;
      const val = String(pv[k]).trim();
      if (val && !slugRegex.test(val)) {
        throw new Error(tByReq(req, "validation.slugInvalid"));
      }
    }
    return true;
  }
  throw new Error(tByReq(req, "validation.slugInvalid"));
}

/* ---------- ObjectId ---------- */
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_: any, { req }: any) =>
    tByReq(req, "validation.invalidObjectId")
  ),
  validateRequest,
];

const validateNameRequired = body("name")
  .customSanitizer(parseIfJson)
  .custom((obj, { req }) => {
    if (!isI18nStringObj(obj)) {
      throw new Error(tByReq(req, "validation.nameInvalid"));
    }
    return true;
  });

const validateNameOptional = body("name")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((obj, { req }) => {
    if (!isI18nStringObj(obj)) {
      throw new Error(tByReq(req, "validation.nameInvalid"));
    }
    return true;
  });

export const validateCreateBrand = [
  validateNameRequired,
  body("slug").optional().custom(validateSlugFlexible),
  body("description").optional().custom((v, { req }) => {
    const pv = parseIfJson(v);
    if (pv == null) return true;
    if (!isI18nStringObj(pv)) throw new Error(tByReq(req, "validation.descriptionInvalid"));
    return true;
  }),
  body("website").optional().isURL().withMessage((_: any, { req }: any) => tByReq(req, "validation.websiteInvalid")),
  body("order").optional().isInt().withMessage((_: any, { req }: any) => tByReq(req, "validation.orderInvalid")),
  body("status").optional().isIn(["active","inactive"]).withMessage((_: any, { req }: any) => tByReq(req, "validation.statusInvalid")),
  validateRequest,
];

export const validateUpdateBrand = [
  validateNameOptional,
  body("slug").optional().custom(validateSlugFlexible),
  body("description").optional().custom((v, { req }) => {
    const pv = parseIfJson(v);
    if (pv == null) return true;
    if (!isI18nStringObj(pv)) throw new Error(tByReq(req, "validation.descriptionInvalid"));
    return true;
  }),
  body("website").optional().isURL().withMessage((_: any, { req }: any) => tByReq(req, "validation.websiteInvalid")),
  body("order").optional().isInt().withMessage((_: any, { req }: any) => tByReq(req, "validation.orderInvalid")),
  body("status").optional().isIn(["active","inactive"]).withMessage((_: any, { req }: any) => tByReq(req, "validation.statusInvalid")),
  validateRequest,
];

export const validateBrandListQuery = [
  query("status").optional().isIn(["active","inactive"]),
  query("q").optional().isString(),
  query("lang").optional().isIn(SUPPORTED_LOCALES).withMessage((_: any, { req }: any) => tByReq(req, "validation.langInvalid")),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  query("sort").optional().isIn(["order_asc","order_desc","created_desc","created_asc"]),
  validateRequest,
];

export const validateSlugParam = [
  // Public route locale-aware olduğu için sadece pattern doğrulanır
  param("slug").matches(slugRegex).withMessage((_: any, { req }: any) => tByReq(req, "validation.slugInvalid")),
  validateRequest,
];
