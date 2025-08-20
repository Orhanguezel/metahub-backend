// src/modules/analytics/analytics.validation.ts
import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { SUPPORTED_LOCALES } from "@/types/common";
import { isValidObjectId } from "@/core/utils/validation";

/* ---------------- helpers ---------------- */
function parseIfJson(v: any) {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return v;
  }
}

/** Locale'i 2 harfe indir, listede yoksa sistem default'una (getLogLocale) çek */
function normalizeLanguage(v: any) {
  const str = String(v ?? "").slice(0, 2).toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(str) ? str : getLogLocale();
}

/** Route param'ı ObjectId kontrolü (i18n hata mesajı) */
export const validateObjectId = (field: string) => [
  param(field)
    .custom((val) => isValidObjectId(val))
    .withMessage((_, { req }) =>
      translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

/* ---------------- POST /analytics/events ---------------- */
export const validateCreateAnalyticsEvent = [
  body("path").notEmpty().withMessage("Path is required."),
  body("method").notEmpty().withMessage("HTTP method is required."),

  body("ip").optional().isString(),
  body("userAgent").optional().isString(),
  body("country").optional().isString(),
  body("city").optional().isString(),

  // GeoJSON veya legacy {lat,lon}; string gelirse önce JSON'a çevir
  body("location")
    .optional()
    .customSanitizer(parseIfJson)
    .custom((val) => {
      if (!val) return true;
      if (
        typeof val === "object" &&
        val.type === "Point" &&
        Array.isArray(val.coordinates) &&
        val.coordinates.length === 2 &&
        val.coordinates.every((c: any) => typeof c === "number")
      )
        return true;
      if (
        typeof val === "object" &&
        typeof val.lat === "number" &&
        typeof val.lon === "number"
      )
        return true;
      throw new Error(
        "Location must be GeoJSON {type:'Point', coordinates:[lon,lat]} or legacy {lat,lon}."
      );
    }),

  body("timestamp").optional().isISO8601().toDate(),

  // String JSON da gelebilir
  body("query").optional().customSanitizer(parseIfJson).isObject(),
  body("body").optional().customSanitizer(parseIfJson).isObject(),
  body("meta").optional().customSanitizer(parseIfJson).isObject(),

  body("module").notEmpty().withMessage("Module is required."),
  body("eventType").notEmpty().withMessage("Event type is required."),

  // Opsiyonel: hangi projede (controller destekliyor)
  body("project").optional().isString(),

  body("userId")
    .optional()
    .custom((val) => !val || isValidObjectId(val))
    .withMessage("userId must be a valid Mongo ObjectId."),

  body("status").optional().isInt(),

  body("language")
    .optional()
    .customSanitizer(normalizeLanguage)
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),

  body("uploadedFiles").optional().isArray(),

  validateRequest,
];

/* ---------------- GET /analytics/events ---------------- */
export const validateGetAnalyticsEvents = [
  query("limit").optional().isInt({ min: 1, max: 1000 }),
  query("skip").optional().isInt({ min: 0 }),

  query("module").optional().isString(),
  query("eventType").optional().isString(),
  query("project").optional().isString(),

  query("userId")
    .optional()
    .custom((val) => !val || isValidObjectId(val))
    .withMessage("userId must be a valid Mongo ObjectId."),

  query("path").optional().isString(),
  query("method").optional().isString(),
  query("country").optional().isString(),
  query("city").optional().isString(),
  query("status").optional().isInt(),

  query("language")
    .optional()
    .customSanitizer(normalizeLanguage)
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),

  // tarih alias’ları: startDate/endDate || from/to
  query("startDate").optional().isISO8601().toDate(),
  query("endDate").optional().isISO8601().toDate(),
  query("from").optional().isISO8601().toDate(),
  query("to").optional().isISO8601().toDate(),

  query("sort").optional().isString(),
  query("fields").optional().isString(),

  // Geo ($near)
  query("nearLat").optional().isFloat({ min: -90, max: 90 }),
  query("nearLon").optional().isFloat({ min: -180, max: 180 }),
  query("nearDistance").optional().isInt({ min: 1, max: 1_000_000 }),

  validateRequest,
];

/* ---------------- GET /analytics/count ---------------- */
export const validateGetAnalyticsCount = [
  query("module").optional().isString(),
  query("eventType").optional().isString(),
  query("project").optional().isString(),

  query("userId")
    .optional()
    .custom((val) => !val || isValidObjectId(val))
    .withMessage("userId must be a valid Mongo ObjectId."),

  query("country").optional().isString(),
  query("city").optional().isString(),

  query("language")
    .optional()
    .customSanitizer(normalizeLanguage)
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),

  validateRequest,
];

/* ---------------- GET /analytics/trends ---------------- */
export const validateGetEventTrends = [
  query("module").optional().isString(),
  query("eventType").optional().isString(),
  query("project").optional().isString(),
  query("country").optional().isString(),
  query("city").optional().isString(),

  query("period").optional().isIn(["day", "month"]),

  query("language")
    .optional()
    .customSanitizer(normalizeLanguage)
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),

  query("startDate").optional().isISO8601().toDate(),
  query("endDate").optional().isISO8601().toDate(),
  query("from").optional().isISO8601().toDate(),
  query("to").optional().isISO8601().toDate(),

  validateRequest,
];

/* ---------------- DELETE /analytics/events ---------------- */
export const validateDeleteAnalyticsEvents = [
  body("module").optional().isString(),
  body("eventType").optional().isString(),
  body("project").optional().isString(),
  body("country").optional().isString(),
  body("city").optional().isString(),

  body("beforeDate").optional().isISO8601().toDate(),

  body("language")
    .optional()
    .customSanitizer(normalizeLanguage)
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),

  validateRequest,
];
