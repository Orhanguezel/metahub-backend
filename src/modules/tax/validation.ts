import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import i18n from "./i18n";

const t = (req: any, k: string) => translate(k, req?.locale || getLogLocale(), i18n);

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_: any, { req }: any) => t(req, "validation.invalidObjectId")),
  validateRequest,
];

const isISODate = (v: any) => !v || !String(v).trim() || !isNaN(Date.parse(v));

export const validateCreateTax = [
  body("name").notEmpty().withMessage((_: any, { req }: any) => t(req, "validation.name")),
  body("zone").optional().isMongoId().withMessage((_: any, { req }: any) => t(req, "validation.invalidObjectId")),
  body("rate").notEmpty().isFloat({ min: 0, max: 1 }).withMessage((_: any, { req }: any) => t(req, "validation.rate")),
  body("inclusive").optional().isBoolean().toBoolean(),
  body("priority").optional().isInt({ min: 0 }).toInt(),
  body("productClasses").optional().custom((v) => Array.isArray(v)).withMessage("productClasses must be array"),
  body("isActive").optional().isBoolean().toBoolean(),
  body("startAt").optional().custom(isISODate).withMessage((_: any, { req }: any) => t(req, "validation.dates")),
  body("endAt").optional().custom(isISODate).withMessage((_: any, { req }: any) => t(req, "validation.dates")),
  validateRequest,
];

export const validateUpdateTax = [
  body("name").optional().isString(),
  body("zone").optional().isMongoId(),
  body("rate").optional().isFloat({ min: 0, max: 1 }),
  body("inclusive").optional().isBoolean().toBoolean(),
  body("priority").optional().isInt({ min: 0 }).toInt(),
  body("productClasses").optional().custom((v) => Array.isArray(v)),
  body("isActive").optional().isBoolean().toBoolean(),
  body("startAt").optional().custom(isISODate),
  body("endAt").optional().custom(isISODate),
  validateRequest,
];

export const validateListQuery = [
  query("isActive").optional().isBoolean().toBoolean(),
  query("zone").optional().isMongoId(),
  query("class").optional().isString(),
  query("q").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 500 }).toInt(),
  validateRequest,
];

/* ----- GeoZone ----- */

export const validateCreateZone = [
  body("name").notEmpty(),
  body("countries").optional().custom((v) => Array.isArray(v)),
  body("states").optional().custom((v) => Array.isArray(v)),
  body("postalCodes").optional().custom((v) => Array.isArray(v)),
  validateRequest,
];

export const validateUpdateZone = [
  body("name").optional().isString(),
  body("countries").optional().custom((v) => Array.isArray(v)),
  body("states").optional().custom((v) => Array.isArray(v)),
  body("postalCodes").optional().custom((v) => Array.isArray(v)),
  validateRequest,
];

export const validateZoneListQuery = [
  query("q").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 500 }).toInt(),
  validateRequest,
];
