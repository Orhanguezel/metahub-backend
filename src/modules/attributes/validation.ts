import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const tByReq = (req: any, k: string) =>
  translate(k, req?.locale || getLogLocale(), translations);

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

const CODE_RE = /^[A-Z0-9_]+$/;                  // üst katmanda uppercase'e normalize edeceğiz
const HEX_RE = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const validateNameRequired = body("name")
  .customSanitizer(parseIfJson)
  .custom((obj, { req }) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj))
      throw new Error(tByReq(req, "validation.nameInvalid"));
    const ok = Object.values(obj).some((v) => typeof v === "string" && v.trim());
    if (!ok) throw new Error(tByReq(req, "validation.nameInvalid"));
    return true;
  });

const validateNameOptional = body("name")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((obj, { req }) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj))
      throw new Error(tByReq(req, "validation.nameInvalid"));
    return true;
  });

const validateValuesOptional = body("values")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((arr, { req }) => {
    if (!Array.isArray(arr)) throw new Error(tByReq(req, "validation.valuesInvalid"));
    for (const v of arr) {
      if (!v || typeof v !== "object") throw new Error(tByReq(req, "validation.valueItemInvalid"));
      if (typeof v.code !== "string" || !CODE_RE.test(String(v.code).toUpperCase()))
        throw new Error(tByReq(req, "validation.valueCodeInvalid"));
      if (v.hex && !HEX_RE.test(String(v.hex)))
        throw new Error(tByReq(req, "validation.hexInvalid"));
      if (v.label && (typeof v.label !== "object" || Array.isArray(v.label)))
        throw new Error(tByReq(req, "validation.valueItemInvalid"));
    }
    return true;
  });

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_: any, { req }: any) => tByReq(req, "validation.invalidObjectId")),
  validateRequest,
];

export const validateCodeParam = [
  param("code").matches(CODE_RE).withMessage((_: any, { req }: any) => tByReq(req, "validation.codeInvalid")),
  validateRequest,
];

export const validateCreateAttribute = [
  body("code").isString().matches(CODE_RE).withMessage((_: any, { req }: any) => tByReq(req, "validation.codeInvalid")),
  validateNameRequired,
  body("type").optional().isIn(["text","select","color","size"]).withMessage((_: any, { req }: any) => tByReq(req, "validation.typeInvalid")),
  validateValuesOptional,
  body("isActive").optional().isBoolean().toBoolean(),

  // new
  body("group").optional().isString(),
  body("sort").optional().isInt(),

  validateRequest,
];

export const validateUpdateAttribute = [
  body("code").optional().isString().matches(CODE_RE).withMessage((_: any, { req }: any) => tByReq(req, "validation.codeInvalid")),
  validateNameOptional,
  body("type").optional().isIn(["text","select","color","size"]).withMessage((_: any, { req }: any) => tByReq(req, "validation.typeInvalid")),
  validateValuesOptional,
  body("isActive").optional().isBoolean().toBoolean(),

  // new
  body("group").optional().isString(),
  body("sort").optional().isInt(),

  validateRequest,
];

export const validateAttributeListQuery = [
  query("q").optional().isString(),
  query("lang").optional().isString(),
  query("type").optional().isIn(["text","select","color","size"]),
  query("isActive").optional().isBoolean().toBoolean(),
  query("group").optional().isString(),                            // ← eklendi
  query("limit").optional().isInt({ min: 1, max: 500 }),
  query("sort").optional().isIn([
    "code_asc","code_desc","created_desc","created_asc","sort_asc","sort_desc" // ← eklendi
  ]),
  validateRequest,
];
