// validation.ts
import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const tByReq = (req: any, k: string) =>
  translate(k, req?.locale || getLogLocale(), translations);

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const emptyToUndef = (v: any) => (v === "" || v === null ? undefined : v);

const CODE_RE = /^[a-z0-9_]+$/;
const APPLY_VALUES = ["cod","below_free_shipping","express_shipping","all"];

/* ---------- create / update validasyonları (değişmedi) ---------- */
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_: any, { req }: any) =>
    tByReq(req, "validation.invalidObjectId")
  ),
  validateRequest,
];

export const validateCreateFee = [
  body("code").isString().matches(CODE_RE).withMessage((_: any, { req }: any) => tByReq(req, "validation.codeInvalid")),
  body("name").customSanitizer(parseIfJson).custom((obj, { req }) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error(tByReq(req, "validation.nameInvalid"));
    const ok = Object.values(obj).some((v) => typeof v === "string" && v.trim());
    if (!ok) throw new Error(tByReq(req, "validation.nameInvalid"));
    return true;
  }),
  body("currency").isString().withMessage((_: any, { req }: any) => tByReq(req, "validation.currencyInvalid")),
  body("mode").isIn(["fixed","percent"]).withMessage((_: any, { req }: any) => tByReq(req, "validation.modeInvalid")),
  body("amount").optional().isInt({ min: 0 }),
  body("percent").optional().isFloat({ min: 0, max: 1 }).withMessage((_: any, { req }: any) => tByReq(req, "validation.percentRange")),
  body("min_cents").optional().isInt({ min: 0 }),
  body("max_cents").optional().isInt({ min: 0 }),
  body("appliesWhen").optional().customSanitizer(parseIfJson).custom((arr, { req }) => {
    if (!Array.isArray(arr)) throw new Error(tByReq(req, "validation.appliesInvalid"));
    for (const it of arr) if (!APPLY_VALUES.includes(String(it))) throw new Error(tByReq(req, "validation.appliesInvalid"));
    return true;
  }),
  body("isActive").optional().isBoolean().toBoolean(),
  // cross-field checks
  body("amount").custom((_, { req }) => {
    if (req.body?.mode === "fixed" && (req.body?.amount === undefined || req.body?.amount === null))
      throw new Error(tByReq(req, "validation.amountRequired"));
    return true;
  }),
  body("percent").custom((_, { req }) => {
    if (req.body?.mode === "percent" && (req.body?.percent === undefined || req.body?.percent === null))
      throw new Error(tByReq(req, "validation.percentRequired"));
    return true;
  }),
  validateRequest,
];

export const validateUpdateFee = [
  body("code").optional({ nullable: true, checkFalsy: true }).isString().matches(CODE_RE).withMessage((_: any, { req }: any) => tByReq(req, "validation.codeInvalid")),
  body("name").optional({ nullable: true, checkFalsy: true }).customSanitizer(parseIfJson).custom((obj, { req }) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error(tByReq(req, "validation.nameInvalid"));
    return true;
  }),
  body("currency").optional({ nullable: true, checkFalsy: true }).isString().withMessage((_: any, { req }: any) => tByReq(req, "validation.currencyInvalid")),
  body("mode").optional({ nullable: true, checkFalsy: true }).isIn(["fixed","percent"]).withMessage((_: any, { req }: any) => tByReq(req, "validation.modeInvalid")),
  body("amount").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }),
  body("percent").optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0, max: 1 }).withMessage((_: any, { req }: any) => tByReq(req, "validation.percentRange")),
  body("min_cents").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }),
  body("max_cents").optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }),
  body("appliesWhen").optional({ nullable: true, checkFalsy: true }).customSanitizer(parseIfJson).custom((arr, { req }) => {
    if (!Array.isArray(arr)) throw new Error(tByReq(req, "validation.appliesInvalid"));
    for (const it of arr) if (!APPLY_VALUES.includes(String(it))) throw new Error(tByReq(req, "validation.appliesInvalid"));
    return true;
  }),
  body("isActive").optional({ nullable: true, checkFalsy: true }).isBoolean().toBoolean(),
  validateRequest,
];

/* ---------- asıl problem buradaydı: boş query’leri yok sayalım ---------- */
export const validateFeeListQuery = [
  query("q").customSanitizer(emptyToUndef).optional({ nullable: true, checkFalsy: true }).isString(),
  query("lang").customSanitizer(emptyToUndef).optional({ nullable: true, checkFalsy: true }).isString(),
  query("isActive").customSanitizer(emptyToUndef).optional({ nullable: true, checkFalsy: true }).isBoolean().toBoolean(),
  query("currency").customSanitizer(emptyToUndef).optional({ nullable: true, checkFalsy: true }).isString(),
  query("mode").customSanitizer(emptyToUndef).optional({ nullable: true, checkFalsy: true }).isIn(["fixed","percent"]),
  query("when")
    .customSanitizer(emptyToUndef)
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(parseIfJson)
    .custom((val, { req }) => {
      if (val === undefined) return true; // tamamen boşsa atla
      const arr = Array.isArray(val) ? val : [val];
      for (const it of arr) if (!APPLY_VALUES.includes(String(it))) throw new Error(tByReq(req, "validation.appliesInvalid"));
      return true;
    }),
  query("limit").customSanitizer(emptyToUndef).optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 500 }).toInt(),
  query("sort").customSanitizer(emptyToUndef).optional({ nullable: true, checkFalsy: true }).isIn(["code_asc","code_desc","created_desc","created_asc"]),
  validateRequest,
];
