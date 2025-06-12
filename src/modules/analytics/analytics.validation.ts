import { body, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🎯 Yeni event kaydı (POST /events)
export const validateCreateAnalyticsEvent = [
  body("path").notEmpty().withMessage("Path is required."),
  body("method").notEmpty().withMessage("HTTP method is required."),
  body("ip").optional().isString(),
  body("userAgent").optional().isString(),
  body("country").optional().isString(),
  body("city").optional().isString(),
  // GeoJSON location validasyonu
  body("location").optional().custom((val) => {
    if (!val) return true;
    // GeoJSON Point desteği
    if (
      typeof val === "object" &&
      val.type === "Point" &&
      Array.isArray(val.coordinates) &&
      val.coordinates.length === 2 &&
      val.coordinates.every((c) => typeof c === "number")
    ) {
      return true;
    }
    // Eski formatı da destekle
    if (
      typeof val === "object" &&
      typeof val.lat === "number" &&
      typeof val.lon === "number"
    ) {
      return true;
    }
    throw new Error(
      "Location must be a GeoJSON {type:'Point', coordinates:[lon,lat]} or {lat, lon} object."
    );
  }),
  body("timestamp").optional().isISO8601().toDate(),
  body("query").optional().isObject(),
  body("body").optional().isObject(),
  body("module").notEmpty().withMessage("Module is required."),
  body("eventType").notEmpty().withMessage("Event type is required."),
  body("userId")
    .optional()
    .custom((val) => !val || /^[a-f\d]{24}$/i.test(val))
    .withMessage("userId must be a valid Mongo ObjectId."),
  body("status").optional().isInt(),
  body("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),
  body("uploadedFiles").optional().isArray(),
  body("meta").optional().isObject(),
  validateRequest,
];

// 🎯 Event listesi (GET /events)
export const validateGetAnalyticsEvents = [
  query("limit").optional().isInt({ min: 1, max: 1000 }),
  query("skip").optional().isInt({ min: 0 }),
  query("module").optional().isString(),
  query("eventType").optional().isString(),
  query("userId")
    .optional()
    .custom((val) => !val || /^[a-f\d]{24}$/i.test(val))
    .withMessage("userId must be a valid Mongo ObjectId."),
  query("path").optional().isString(),
  query("method").optional().isString(),
  query("country").optional().isString(),
  query("city").optional().isString(),
  query("status").optional().isInt(),
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),
  query("startDate").optional().isISO8601().toDate(),
  query("endDate").optional().isISO8601().toDate(),
  query("sort").optional().isString(),
  // GeoQuery
  query("nearLat").optional().isFloat({ min: -90, max: 90 }),
  query("nearLon").optional().isFloat({ min: -180, max: 180 }),
  query("nearDistance").optional().isInt({ min: 1, max: 1000000 }),
  validateRequest,
];

// 🎯 Event count (GET /count)
export const validateGetAnalyticsCount = [
  query("module").optional().isString(),
  query("eventType").optional().isString(),
  query("userId")
    .optional()
    .custom((val) => !val || /^[a-f\d]{24}$/i.test(val))
    .withMessage("userId must be a valid Mongo ObjectId."),
  query("country").optional().isString(),
  query("city").optional().isString(),
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),
  validateRequest,
];

// 🎯 Event trends (GET /trends)
export const validateGetEventTrends = [
  query("module").optional().isString(),
  query("eventType").optional().isString(),
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),
  query("country").optional().isString(),
  query("city").optional().isString(),
  query("period").optional().isIn(["day", "month"]),
  query("startDate").optional().isISO8601().toDate(),
  query("endDate").optional().isISO8601().toDate(),
  validateRequest,
];

// 🎯 Event silme (DELETE /events)
export const validateDeleteAnalyticsEvents = [
  body("module").optional().isString(),
  body("eventType").optional().isString(),
  body("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),
  body("country").optional().isString(),
  body("city").optional().isString(),
  body("beforeDate").optional().isISO8601().toDate(),
  validateRequest,
];
