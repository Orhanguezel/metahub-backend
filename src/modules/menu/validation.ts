import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const tReq = (req: any) => (k: string, p?: any) => translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) => tReq(req)("validation.invalidObjectId")),
  validateRequest,
];

/* common helpers */
const categoriesValidator = (val: any, { req }: any) => {
  const t = tReq(req);
  const arr = typeof val === "string" ? JSON.parse(val) : val;
  if (!Array.isArray(arr)) throw new Error(t("validation.categoriesInvalid"));
  for (const it of arr) {
    if (!it || typeof it !== "object") throw new Error(t("validation.categoriesInvalid"));
    if (!it.category || typeof it.category !== "string" || !/^[a-f\d]{24}$/i.test(it.category))
      throw new Error(t("validation.categoryIdInvalid"));
    if (it.order !== undefined && !(Number.isInteger(it.order) && it.order >= 0 && it.order <= 100000))
      throw new Error(t("validation.orderInvalid"));
    if (it.isFeatured !== undefined && typeof it.isFeatured !== "boolean")
      throw new Error(t("validation.booleanField"));
  }
  return true;
};

const branchesValidator = (val: any, { req }: any) => {
  const t = tReq(req);
  const arr = typeof val === "string" ? JSON.parse(val) : val;
  if (!Array.isArray(arr)) throw new Error(t("validation.branchesInvalid"));
  for (const id of arr) {
    if (!(typeof id === "string" && /^[a-f\d]{24}$/i.test(id))) throw new Error(t("validation.branchIdInvalid"));
  }
  return true;
};

/* CREATE */
export const validateCreateMenu = [
  body("code").isString().trim().notEmpty().withMessage((_, { req }) => tReq(req)("validation.codeRequired")),
  body("slug").optional().isString().withMessage((_, { req }) => tReq(req)("validation.slugInvalid")),
  body("name").customSanitizer(parseIfJson).custom((val, { req }) => {
    validateMultilangField(val);
    const hasAny = Object.values(val || {}).some((v) => typeof v === "string" && v.trim().length > 0);
    if (!hasAny) throw new Error(tReq(req)("validation.nameRequired"));
    return true;
  }),
  body("description").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("branches").optional().custom(branchesValidator),
  body("categories").optional().custom(categoriesValidator),
  body("effectiveFrom").optional().isISO8601().withMessage((_, { req }) => tReq(req)("validation.datesInvalid")),
  body("effectiveTo").optional().isISO8601().withMessage((_, { req }) => tReq(req)("validation.datesInvalid")),
  body("isPublished").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  validateRequest,
];

/* UPDATE */
export const validateUpdateMenu = [
  body("code").optional().isString().trim().notEmpty().withMessage((_, { req }) => tReq(req)("validation.codeRequired")),
  body("slug").optional().isString().withMessage((_, { req }) => tReq(req)("validation.slugInvalid")),
  body("name").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("description").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("branches").optional().custom(branchesValidator),
  body("categories").optional().custom(categoriesValidator),
  body("effectiveFrom").optional().isISO8601().withMessage((_, { req }) => tReq(req)("validation.datesInvalid")),
  body("effectiveTo").optional().isISO8601().withMessage((_, { req }) => tReq(req)("validation.datesInvalid")),
  body("isPublished").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  body("removedImages").optional().custom((val, { req }) => {
    try { const p = typeof val === "string" ? JSON.parse(val) : val; if (!Array.isArray(p)) throw new Error(); return true; }
    catch { throw new Error(tReq(req)("validation.imageRemoveInvalid")); }
  }),
  validateRequest,
];

/* Admin list */
export const validateAdminQuery = [
  query("q").optional().isString(),
  query("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  query("isPublished").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  query("branch").optional().isMongoId().withMessage((_, { req }) => tReq(req)("validation.branchIdInvalid")),
  query("category").optional().isMongoId().withMessage((_, { req }) => tReq(req)("validation.categoryIdInvalid")),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

/* Public list */
export const validatePublicQuery = [
  query("q").optional().isString(),
  query("branch").optional().isMongoId().withMessage((_, { req }) => tReq(req)("validation.branchIdInvalid")),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
];

/* Slug */
export const validateSlug = [
  param("slug").isString().trim().notEmpty().withMessage((_, { req }) => tReq(req)("validation.slugInvalid")),
  validateRequest,
];
