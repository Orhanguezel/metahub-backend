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

/* CREATE */
export const validateCreateMenuCategory = [
  body("code").isString().trim().notEmpty().withMessage((_, { req }) => tReq(req)("validation.codeRequired")),
  body("slug").optional().isString().withMessage((_, { req }) => tReq(req)("validation.slugInvalid")),
  body("name").customSanitizer(parseIfJson).custom((val, { req }) => {
    validateMultilangField(val);
    // en az bir dilde non-empty
    const hasAny = Object.entries(val || {}).some(([, s]) => typeof s === "string" && s.trim().length > 0);
    if (!hasAny) throw new Error(tReq(req)("validation.nameRequired"));
    return true;
  }),
  body("description").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("order").optional().isInt({ min: 0, max: 100000 }).withMessage((_, { req }) => tReq(req)("validation.orderInvalid")),
  body("isPublished").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  // images: opsiyonel — file upload ile gelir
  validateRequest,
];

/* UPDATE */
export const validateUpdateMenuCategory = [
  body("code").optional().isString().trim().notEmpty().withMessage((_, { req }) => tReq(req)("validation.codeRequired")),
  body("slug").optional().isString().withMessage((_, { req }) => tReq(req)("validation.slugInvalid")),
  body("name").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("description").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("order").optional().isInt({ min: 0, max: 100000 }).withMessage((_, { req }) => tReq(req)("validation.orderInvalid")),
  body("isPublished").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  body("removedImages").optional().custom((val, { req }) => {
    try {
      const parsed = typeof val === "string" ? JSON.parse(val) : val;
      if (!Array.isArray(parsed)) throw new Error();
      return true;
    } catch {
      throw new Error(tReq(req)("validation.imageRemoveInvalid"));
    }
  }),
  validateRequest,
];

/* Admin List/Public List */
export const validateAdminQuery = [
  query("q").optional().isString(),
  query("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  query("isPublished").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

export const validatePublicQuery = [
  query("q").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
