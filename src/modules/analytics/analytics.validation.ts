import { body, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🎯 Yeni event kaydı (POST /events)
export const validateCreateAnalyticsEvent = [
  body("path").notEmpty().withMessage("Path is required."),
  body("method").notEmpty().withMessage("HTTP method is required."),
  body("ip").optional().isString(),
  body("userAgent").optional().isString(),
  body("timestamp").optional().isISO8601().toDate(),
  body("query").optional().isObject(),
  body("body").optional().isObject(),
  body("module").notEmpty().withMessage("Module is required."),
  body("eventType").notEmpty().withMessage("Event type is required."),
  body("userId").optional().isMongoId().withMessage("userId must be a valid ObjectId."),
  validateRequest,
];

// 🎯 Event listesi (GET /events)
export const validateGetAnalyticsEvents = [
  query("limit").optional().isInt({ min: 1, max: 1000 }),
  query("skip").optional().isInt({ min: 0 }),
  query("module").optional().isString(),
  query("eventType").optional().isString(),
  query("userId").optional().isMongoId().withMessage("userId must be a valid ObjectId."),
  query("path").optional().isString(),
  query("method").optional().isString(),
  query("startDate").optional().isISO8601().toDate(),
  query("endDate").optional().isISO8601().toDate(),
  query("sort").optional().isString(),
  validateRequest,
];

// 🎯 Event count (GET /count)
export const validateGetAnalyticsCount = [
  query("module").optional().isString(),
  query("eventType").optional().isString(),
  query("userId").optional().isMongoId().withMessage("userId must be a valid ObjectId."),
  validateRequest,
];

// 🎯 Event trends (GET /trends)
export const validateGetEventTrends = [
  query("module").optional().isString(),
  query("eventType").optional().isString(),
  query("period").optional().isIn(["day", "month"]),
  query("startDate").optional().isISO8601().toDate(),
  query("endDate").optional().isISO8601().toDate(),
  validateRequest,
];

// 🎯 Event silme (DELETE /events)
export const validateDeleteAnalyticsEvents = [
  body("module").optional().isString(),
  body("eventType").optional().isString(),
  body("beforeDate").optional().isISO8601().toDate(),
  validateRequest,
];
