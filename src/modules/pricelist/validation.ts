import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) => translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)),
  validateRequest,
];

/* -------- PriceList (Admin) -------- */

export const validateCreatePriceList = [
  body("code").optional().customSanitizer(toUpperSnake).matches(/^[A-Z0-9_]+$/).withMessage((_, { req }) =>
    translate("validation.invalidCode", req.locale || getLogLocale(), translations)
  ),

  validateMultilangField("name"),
  body("description").optional().customSanitizer(parseIfJson),

  body("defaultCurrency").exists().isIn(["USD", "EUR", "TRY"]).withMessage((_, { req }) =>
    translate("validation.invalidCurrency", req.locale || getLogLocale(), translations)
  ),

  body("effectiveFrom").exists().isISO8601().toDate().withMessage((_, { req }) =>
    translate("validation.invalidDate", req.locale || getLogLocale(), translations)
  ),
  body("effectiveTo").optional({ nullable: true }).isISO8601().toDate().withMessage((_, { req }) =>
    translate("validation.invalidDate", req.locale || getLogLocale(), translations)
  ),

  body("status").optional().isIn(["draft", "active", "archived"]).withMessage((_, { req }) =>
    translate("validation.invalidStatus", req.locale || getLogLocale(), translations)
  ),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),

  body("apartmentCategoryIds").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) return true;
    const ok = arr.every((v) => typeof v === "string");
    if (!ok) throw new Error(translate("validation.invalidCategoryArray", req.locale || getLogLocale(), translations));
    return true;
  }),

  validateRequest,
];

export const validateUpdatePriceList = [
  body("code").optional().customSanitizer(toUpperSnake).matches(/^[A-Z0-9_]+$/).withMessage((_, { req }) =>
    translate("validation.invalidCode", req.locale || getLogLocale(), translations)
  ),
  body("name").optional().customSanitizer(parseIfJson),
  body("description").optional().customSanitizer(parseIfJson),
  body("defaultCurrency").optional().isIn(["USD", "EUR", "TRY"]).withMessage((_, { req }) =>
    translate("validation.invalidCurrency", req.locale || getLogLocale(), translations)
  ),
  body("effectiveFrom").optional().isISO8601().toDate().withMessage((_, { req }) =>
    translate("validation.invalidDate", req.locale || getLogLocale(), translations)
  ),
  body("effectiveTo").optional({ nullable: true }).isISO8601().toDate().withMessage((_, { req }) =>
    translate("validation.invalidDate", req.locale || getLogLocale(), translations)
  ),
  body("status").optional().isIn(["draft", "active", "archived"]).withMessage((_, { req }) =>
    translate("validation.invalidStatus", req.locale || getLogLocale(), translations)
  ),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  body("apartmentCategoryIds").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(translate("validation.invalidCategoryArray", req.locale || getLogLocale(), translations));
    const ok = arr.every((v) => typeof v === "string");
    if (!ok) throw new Error(translate("validation.invalidCategoryArray", req.locale || getLogLocale(), translations));
    return true;
  }),
  validateRequest,
];

export const validatePriceListAdminQuery = [
  query("q").optional().isString().trim(),
  query("status").optional().isIn(["draft", "active", "archived"]).withMessage((_, { req }) =>
    translate("validation.invalidStatus", req.locale || getLogLocale(), translations)
  ),
  query("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  query("region").optional().isString().trim(),
  query("segment").optional().isString().trim(),
  query("effectiveAt").optional().isISO8601().withMessage((_, { req }) =>
    translate("validation.invalidDate", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* -------- PriceList Items (Admin) -------- */

export const validateCreatePriceListItem = [
  body("serviceCode")
    .exists()
    .customSanitizer(toUpperSnake)
    .matches(/^[A-Z0-9_]+$/)
    .withMessage((_, { req }) =>
      translate("validation.invalidServiceCode", req.locale || getLogLocale(), translations)
    ),
  body("amount").exists().isFloat({ min: 0 }).withMessage((_, { req }) =>
    translate("validation.amountPositive", req.locale || getLogLocale(), translations)
  ),
  body("currency").optional().isIn(["USD", "EUR", "TRY"]).withMessage((_, { req }) =>
    translate("validation.invalidCurrency", req.locale || getLogLocale(), translations)
  ),
  body("period").exists().isIn(["weekly", "monthly", "quarterly", "yearly", "once"]).withMessage((_, { req }) =>
    translate("validation.invalidPeriod", req.locale || getLogLocale(), translations)
  ),
  body("notes").optional().isString(),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

export const validateUpdatePriceListItem = [
  body("serviceCode").optional().customSanitizer(toUpperSnake).matches(/^[A-Z0-9_]+$/).withMessage((_, { req }) =>
    translate("validation.invalidServiceCode", req.locale || getLogLocale(), translations)
  ),
  body("amount").optional().isFloat({ min: 0 }).withMessage((_, { req }) =>
    translate("validation.amountPositive", req.locale || getLogLocale(), translations)
  ),
  body("currency").optional().isIn(["USD", "EUR", "TRY"]).withMessage((_, { req }) =>
    translate("validation.invalidCurrency", req.locale || getLogLocale(), translations)
  ),
  body("period").optional().isIn(["weekly", "monthly", "quarterly", "yearly", "once"]).withMessage((_, { req }) =>
    translate("validation.invalidPeriod", req.locale || getLogLocale(), translations)
  ),
  body("notes").optional().isString(),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

export const validatePriceListItemsAdminQuery = [
  query("serviceCode").optional().customSanitizer(toUpperSnake),
  query("period").optional().isIn(["weekly", "monthly", "quarterly", "yearly", "once"]).withMessage((_, { req }) =>
    translate("validation.invalidPeriod", req.locale || getLogLocale(), translations)
  ),
  query("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* -------- Public -------- */
export const validatePublicListQuery = [
  query("region").optional().isString().trim(),
  query("segment").optional().isString().trim(),
  query("onDate").optional().isISO8601().withMessage((_, { req }) =>
    translate("validation.invalidDate", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

export const validateCodeParam = [
  param("code")
    .exists()
    .customSanitizer(toUpperSnake)
    .matches(/^[A-Z0-9_]+$/)
    .withMessage((_, { req }) =>
      translate("validation.invalidCode", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

export const validatePriceLookupQuery = [
  query("serviceCode")
    .exists()
    .customSanitizer(toUpperSnake)
    .matches(/^[A-Z0-9_]+$/)
    .withMessage((_, { req }) =>
      translate("validation.invalidServiceCode", req.locale || getLogLocale(), translations)
    ),
  query("period")
    .exists()
    .isIn(["weekly", "monthly", "quarterly", "yearly", "once"])
    .withMessage((_, { req }) =>
      translate("validation.invalidPeriod", req.locale || getLogLocale(), translations)
    ),
  query("onDate").optional().isISO8601().withMessage((_, { req }) =>
    translate("validation.invalidDate", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];
